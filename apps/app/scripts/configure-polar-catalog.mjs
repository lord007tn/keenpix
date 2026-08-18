import { Polar } from '@polar-sh/sdk'

const CATALOG = {
  founding: {
    basic: { monthlyCents: 900, includedGb: 100, overageCents: 8 },
    pro: { monthlyCents: 1900, includedGb: 400, overageCents: 6 },
    business: { monthlyCents: 3900, includedGb: 1000, overageCents: 5 },
  },
  standard: {
    basic: { monthlyCents: 900, includedGb: 100, overageCents: 12 },
    pro: { monthlyCents: 2900, includedGb: 400, overageCents: 9 },
    business: { monthlyCents: 6900, includedGb: 1000, overageCents: 7 },
  },
}

const PLAN_NAMES = { basic: 'Basic', pro: 'Pro', business: 'Business' }
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

const planProducts = products.filter(
  (product) =>
    typeof product.metadata.plan === 'string' &&
    product.metadata.plan in CATALOG.founding &&
    product.metadata.interval === 'month',
)
const meterIds = new Set()
for (const product of planProducts) {
  for (const price of product.prices) {
    if (price.amountType === 'metered_unit' && !price.isArchived) {
      meterIds.add(price.meterId)
    }
  }
}
if (meterIds.size !== 1) {
  throw new Error(
    `Expected one canonical delivery meter across active plan products, found ${meterIds.size}.`,
  )
}
const meterId = [...meterIds][0]
const meter = await client.meters.get({ id: meterId })

if (apply) {
  await client.meters.update({
    id: meterId,
    meterUpdate: {
      name: 'Managed Image Delivery',
      metadata: {
        ...meter.metadata,
        billing_scope: 'managed_delivery',
        counts_edge_delivery: true,
      },
    },
  })
}

function phaseOf(product) {
  return product.metadata.pricing_phase === 'standard' ? 'standard' : 'founding'
}

function description(phase, expected) {
  const allowance =
    expected.includedGb >= 1000 ? '1 TB' : `${expected.includedGb} GB`
  const label = phase === 'founding' ? 'Founding price' : 'Standard price'
  return `${label}: ${allowance} of optimized managed image delivery, unlimited transformations and team members, then $${(expected.overageCents / 100).toFixed(2)}/GB.`
}

function metadata(plan, phase, expected, current = {}) {
  return {
    ...current,
    plan,
    interval: 'month',
    pricing_phase: phase,
    included_gb: expected.includedGb,
    overage_per_gb_cents: expected.overageCents,
    billing_scope: 'managed_delivery',
    team_members: 'unlimited',
    // Descriptive offer metadata only. The application does not schedule or
    // perform an automatic migration to a standard product after month 12.
    ...(phase === 'founding' ? { price_lock_months: 12 } : {}),
  }
}

const managed = []
for (const phase of Object.keys(CATALOG)) {
  for (const plan of Object.keys(CATALOG[phase])) {
    const expected = CATALOG[phase][plan]
    const matches = planProducts.filter(
      (product) => product.metadata.plan === plan && phaseOf(product) === phase,
    )
    if (matches.length > 1) {
      throw new Error(
        `Expected at most one ${phase} ${plan} product, found ${matches.length}.`,
      )
    }
    let product = matches[0]
    if (!product) {
      if (!apply) {
        process.stdout.write(
          `${server} ${phase}/${plan}: would create $${expected.monthlyCents / 100} + $${(expected.overageCents / 100).toFixed(2)}/GB\n`,
        )
        continue
      }
      product = await client.products.create({
        name: `${PLAN_NAMES[plan]} — ${phase === 'founding' ? 'Founding' : 'Standard'}`,
        description: description(phase, expected),
        recurringInterval: 'month',
        recurringIntervalCount: 1,
        trialInterval: 'day',
        trialIntervalCount: 14,
        visibility: 'private',
        metadata: metadata(plan, phase, expected),
        prices: [
          {
            amountType: 'fixed',
            priceAmount: expected.monthlyCents,
            priceCurrency: 'usd',
          },
          {
            amountType: 'metered_unit',
            meterId,
            unitAmount: expected.overageCents,
            priceCurrency: 'usd',
          },
        ],
      })
      process.stdout.write(`${server} ${phase}/${plan}: created\n`)
    }

    const fixedPrices = product.prices.filter(
      (price) => price.amountType === 'fixed' && !price.isArchived,
    )
    const meteredPrices = product.prices.filter(
      (price) => price.amountType === 'metered_unit' && !price.isArchived,
    )
    if (fixedPrices.length !== 1 || meteredPrices.length !== 1) {
      throw new Error(
        `${phase}/${plan} must have exactly one active fixed price and one active metered price.`,
      )
    }
    const fixedPrice = fixedPrices[0]
    const meteredPrice = meteredPrices[0]
    const fixedMatches = fixedPrice.priceAmount === expected.monthlyCents
    const meteredMatches =
      Number(meteredPrice.unitAmount) === expected.overageCents &&
      meteredPrice.meterId === meterId
    const metadataMatches =
      product.metadata.pricing_phase === phase &&
      product.metadata.included_gb === expected.includedGb &&
      product.metadata.overage_per_gb_cents === expected.overageCents &&
      (phase !== 'founding' || product.metadata.price_lock_months === 12)

    if (apply && !(fixedMatches && meteredMatches && metadataMatches)) {
      product = await client.products.update({
        id: product.id,
        productUpdate: {
          name: `${PLAN_NAMES[plan]} — ${phase === 'founding' ? 'Founding' : 'Standard'}`,
          description: description(phase, expected),
          visibility: 'private',
          metadata: metadata(plan, phase, expected, product.metadata),
          prices: [
            fixedMatches
              ? { id: fixedPrice.id }
              : {
                  amountType: 'fixed',
                  priceAmount: expected.monthlyCents,
                  priceCurrency: fixedPrice.priceCurrency,
                },
            meteredMatches
              ? { id: meteredPrice.id }
              : {
                  amountType: 'metered_unit',
                  meterId,
                  unitAmount: expected.overageCents,
                  priceCurrency: meteredPrice.priceCurrency,
                },
          ],
        },
      })
    }
    managed.push({ phase, plan, productId: product.id, expected })
    let status = 'needs update'
    if (apply || (fixedMatches && meteredMatches && metadataMatches)) {
      status = 'verified'
    }
    process.stdout.write(
      `${server} ${phase}/${plan}: $${expected.monthlyCents / 100}, ${expected.includedGb} GB, $${(expected.overageCents / 100).toFixed(2)}/GB — ${status}\n`,
    )
  }
}

if (!apply && managed.length !== 6) {
  process.stdout.write(
    `${server}: ${6 - managed.length} product(s) need creation; pass --apply.\n`,
  )
}

if (apply) {
  if (managed.length !== 6) {
    throw new Error(
      `Expected six managed products after apply, found ${managed.length}.`,
    )
  }
  for (const state of managed) {
    const product = await client.products.get({ id: state.productId })
    const fixed = product.prices.filter(
      (price) => price.amountType === 'fixed' && !price.isArchived,
    )
    const metered = product.prices.filter(
      (price) => price.amountType === 'metered_unit' && !price.isArchived,
    )
    if (
      fixed.length !== 1 ||
      metered.length !== 1 ||
      fixed[0].priceAmount !== state.expected.monthlyCents ||
      Number(metered[0].unitAmount) !== state.expected.overageCents ||
      metered[0].meterId !== meterId ||
      phaseOf(product) !== state.phase
    ) {
      throw new Error(`${state.phase}/${state.plan} failed verification.`)
    }
  }
  const verifiedMeter = await client.meters.get({ id: meterId })
  if (
    verifiedMeter.name !== 'Managed Image Delivery' ||
    verifiedMeter.metadata.billing_scope !== 'managed_delivery' ||
    verifiedMeter.metadata.counts_edge_delivery !== true
  ) {
    throw new Error('Polar did not retain the managed-delivery meter settings.')
  }
}

process.stdout.write(
  apply
    ? `${server}: founding and standard catalogs updated and verified.\n`
    : `${server}: dry run only; pass --apply to create or update products.\n`,
)
