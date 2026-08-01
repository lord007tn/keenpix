import { Polar } from '@polar-sh/sdk'

const PLAN_UNITS = { basic: 100, pro: 400, business: 1000 }

const apply = process.argv.includes('--apply')
const serverArgument = process.argv.find((value) =>
  value.startsWith('--server='),
)
const server = serverArgument?.split('=')[1] ?? process.env.POLAR_SERVER

if (!['sandbox', 'production'].includes(server)) {
  throw new Error('Pass --server=sandbox|production or set POLAR_SERVER.')
}
if (!process.env.POLAR_TOKEN) {
  throw new Error(
    'POLAR_TOKEN is required and is never printed by this script.',
  )
}

const client = new Polar({ accessToken: process.env.POLAR_TOKEN, server })
const products = []
for await (const page of await client.products.list({
  isArchived: false,
  limit: 100,
})) {
  products.push(...page.result.items)
}
const benefits = []
for await (const page of await client.benefits.list({ limit: 100 })) {
  benefits.push(...page.result.items)
}

const targets = products.filter(
  (product) =>
    typeof product.metadata.plan === 'string' &&
    product.metadata.plan in PLAN_UNITS &&
    product.metadata.interval === 'month',
)

if (targets.length !== 3) {
  throw new Error(
    `Expected exactly 3 active monthly plan products, found ${targets.length}. Refusing to mutate.`,
  )
}

const meterIds = new Set()
for (const product of targets) {
  const meteredPrices = product.prices.filter(
    (price) => price.amountType === 'metered_unit',
  )
  if (meteredPrices.length !== 1) {
    throw new Error(
      `${product.metadata.plan}/${product.metadata.interval} must have exactly one metered price.`,
    )
  }
  meterIds.add(meteredPrices[0].meterId)
}
if (meterIds.size !== 1) {
  throw new Error('The three products do not share one canonical usage meter.')
}
const canonicalMeterId = [...meterIds][0]

for (const plan of Object.keys(PLAN_UNITS)) {
  const planProducts = targets.filter(
    (product) => product.metadata.plan === plan,
  )
  if (planProducts.length !== 1) {
    throw new Error(
      `Expected one monthly ${plan} product, found ${planProducts.length}.`,
    )
  }

  const expectedUnits = PLAN_UNITS[plan]
  const matchingBenefits = benefits.filter(
    (benefit) =>
      benefit.type === 'meter_credit' &&
      !benefit.isDeleted &&
      benefit.description.toLowerCase() === `included bandwidth (${plan})` &&
      benefit.properties.units === expectedUnits &&
      benefit.properties.rollover === false &&
      benefit.properties.meterId === canonicalMeterId,
  )
  if (matchingBenefits.length !== 1) {
    throw new Error(
      `Expected one ${plan} ${expectedUnits} GB no-rollover benefit, found ${matchingBenefits.length}.`,
    )
  }
  const benefit = matchingBenefits[0]

  for (const product of planProducts) {
    const existing = product.benefits.map((item) => item.id)
    const next = [...new Set([...existing, benefit.id])]
    const interval = product.metadata.interval
    if (next.length === existing.length) {
      process.stdout.write(`${plan}/${interval}: already attached\n`)
      continue
    }
    if (!apply) {
      process.stdout.write(`${plan}/${interval}: would attach 1 benefit\n`)
      continue
    }
    const updated = await client.products.updateBenefits({
      id: product.id,
      productBenefitsUpdate: { benefits: next },
    })
    if (!updated.benefits.some((item) => item.id === benefit.id)) {
      throw new Error(`${plan}/${interval}: Polar did not retain the benefit.`)
    }
    process.stdout.write(`${plan}/${interval}: attached and verified\n`)
  }
}

process.stdout.write(
  apply
    ? 'Polar benefit configuration verified.\n'
    : 'Dry run only; pass --apply to update.\n',
)
