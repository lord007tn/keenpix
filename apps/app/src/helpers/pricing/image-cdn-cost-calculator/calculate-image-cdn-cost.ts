import { PLANS, STANDARD_PLAN_PRICES } from '@/lib/billing/plans'

export interface ImageCdnCostInputs {
  customDomains: number
  deliveredGb: number
  projects: number
  region: 'asia' | 'eu-na' | 'mea' | 'south-america'
  requests: number
  sourceStorageGb: number
  uniqueTransforms: number
}

const money = (value: number) => Math.round(value * 100) / 100

export function calculateImageCdnCosts(inputs: ImageCdnCostInputs) {
  const keenpixPlans = Object.values(PLANS).map((plan) => {
    const terms = STANDARD_PLAN_PRICES[plan.id]
    const includedGb = plan.includedBandwidthBytes / 1024 ** 3
    const projectFits =
      plan.maxProjects === null || inputs.projects <= plan.maxProjects
    const includedDomains = plan.customDomains ?? Number.POSITIVE_INFINITY
    const extraDomains = Math.max(0, inputs.customDomains - includedDomains)
    const domainPacks = plan.id === 'business' ? Math.ceil(extraDomains / 5) : 0
    const domainFits = extraDomains === 0 || plan.id === 'business'
    return {
      fits: projectFits && domainFits,
      monthly: money(
        terms.priceMonthlyUsd +
          Math.max(0, inputs.deliveredGb - includedGb) *
            (terms.overagePerGbCents / 100) +
          domainPacks * 5,
      ),
      plan: plan.name,
    }
  })
  const keenpix = keenpixPlans
    .filter((plan) => plan.fits)
    .sort((left, right) => left.monthly - right.monthly)[0]

  const cloudinaryCredits =
    inputs.deliveredGb + inputs.sourceStorageGb + inputs.uniqueTransforms / 1000
  const cloudinaryPlans = [
    { credits: 25, monthly: 0, plan: 'Free' },
    { credits: 225, monthly: 99, plan: 'Plus' },
    { credits: 600, monthly: 249, plan: 'Advanced' },
    { credits: 1350, monthly: 549, plan: 'Advanced Extra' },
    { credits: 2750, monthly: 1099, plan: 'Pro' },
  ]
  const cloudinary = cloudinaryPlans.find(
    (plan) =>
      cloudinaryCredits <= plan.credits &&
      (inputs.customDomains === 0 || plan.credits >= 600),
  )

  const imgixCredits = inputs.deliveredGb + inputs.sourceStorageGb * 2
  const imgix = [
    { credits: 100, monthly: 25, plan: 'Starter' },
    { credits: 375, monthly: 75, plan: 'Basic' },
    { credits: 830, monthly: 150, plan: 'Midrange' },
    { credits: 1875, monthly: 300, plan: 'Growth' },
    { credits: 3570, monthly: 500, plan: 'Growth Plus' },
  ].find((plan) => imgixCredits <= plan.credits)

  const imageKitOptions = [
    {
      monthly: 0,
      plan: 'Free',
      valid:
        inputs.customDomains === 0 &&
        inputs.deliveredGb <= 20 &&
        inputs.sourceStorageGb <= 3,
    },
    {
      monthly:
        9 +
        Math.max(0, inputs.deliveredGb - 40) * 0.5 +
        Math.max(0, inputs.sourceStorageGb - 10) * 0.1,
      plan: 'Lite',
      valid: inputs.customDomains === 0,
    },
    {
      monthly:
        89 +
        Math.max(0, inputs.deliveredGb - 225) * 0.45 +
        Math.max(0, inputs.sourceStorageGb - 225) * 0.09,
      plan: 'Pro',
      valid: true,
    },
  ].filter((plan) => plan.valid)
  const imageKit = imageKitOptions.reduce((best, plan) =>
    plan.monthly < best.monthly ? plan : best,
  )

  const gumlet = [
    {
      monthly: Math.max(0, inputs.deliveredGb - 30) * 0.5,
      plan: 'Free',
    },
    {
      monthly: 32 + Math.max(0, inputs.deliveredGb - 300) * 0.15,
      plan: 'Growth',
    },
    {
      monthly: 199 + Math.max(0, inputs.deliveredGb - 2500) * 0.08,
      plan: 'Business',
    },
  ].reduce((best, plan) => (plan.monthly < best.monthly ? plan : best))

  const twicPicsOptions = [
    {
      monthly: 0,
      plan: 'Free',
      valid:
        inputs.deliveredGb <= 3 &&
        inputs.projects <= 1 &&
        inputs.customDomains === 0,
    },
    {
      monthly: 19 + Math.max(0, inputs.deliveredGb - 40) * 0.5,
      plan: 'Business',
      valid: inputs.projects <= 1 && inputs.customDomains <= 2,
    },
    {
      monthly: 99 + Math.max(0, inputs.deliveredGb - 250) * 0.4,
      plan: 'Business Plus',
      valid: inputs.projects <= 3 && inputs.customDomains <= 9,
    },
  ].filter((plan) => plan.valid)
  const twicPics = twicPicsOptions.sort(
    (left, right) => left.monthly - right.monthly,
  )[0]

  const bunnyRate = {
    'eu-na': 0.01,
    asia: 0.03,
    'south-america': 0.045,
    mea: 0.06,
  }[inputs.region]

  const estimatedImageBytes =
    inputs.requests > 0 ? (inputs.deliveredGb * 1024 ** 3) / inputs.requests : 0
  const vercelReadUnits =
    inputs.requests * Math.max(1, Math.ceil(estimatedImageBytes / 64_000))
  const vercelWriteUnits =
    inputs.uniqueTransforms *
    Math.max(1, Math.ceil(estimatedImageBytes / 8_000_000))
  const vercelLow =
    (Math.max(0, inputs.uniqueTransforms - 5000) / 1000) * 0.05 +
    (Math.max(0, vercelReadUnits - 300_000) / 1_000_000) * 0.4 +
    (Math.max(0, vercelWriteUnits - 100_000) / 1_000_000) * 4
  const vercelHigh =
    (Math.max(0, inputs.uniqueTransforms - 5000) / 1000) * 0.0812 +
    (Math.max(0, vercelReadUnits - 300_000) / 1_000_000) * 0.64 +
    (Math.max(0, vercelWriteUnits - 100_000) / 1_000_000) * 6.4

  return [
    {
      id: 'keenpix',
      monthly: keenpix?.monthly ?? null,
      plan: keenpix?.plan ?? 'Contact Keenpix',
      status: keenpix ? 'comparable' : 'quote',
      detail:
        'Managed delivery, published overage, and eligible custom-domain packs.',
    },
    {
      id: 'cloudinary',
      monthly: cloudinary?.monthly ?? null,
      plan: cloudinary?.plan ?? 'Custom quote',
      status: cloudinary ? 'comparable' : 'quote',
      detail: `${money(cloudinaryCredits)} estimated pooled credits across delivery, storage, and transforms.`,
    },
    {
      id: 'imgix',
      monthly: imgix?.monthly ?? null,
      plan: imgix?.plan ?? 'Custom quote',
      status: imgix ? 'partial' : 'quote',
      detail: `${money(imgixCredits)} delivery and management credits; feature-specific transform credits excluded.`,
    },
    {
      id: 'imagekit',
      monthly: money(imageKit.monthly),
      plan: imageKit.plan,
      status: 'comparable',
      detail: 'Published delivery and media-storage allowances plus overage.',
    },
    {
      id: 'gumlet',
      monthly: money(gumlet.monthly),
      plan: gumlet.plan,
      status: 'comparable',
      detail: 'Public Gumlet Image bandwidth plan; video is excluded.',
    },
    {
      id: 'twicpics',
      monthly: twicPics ? money(twicPics.monthly) : null,
      plan: twicPics?.plan ?? 'Enterprise quote',
      status: twicPics ? 'comparable' : 'quote',
      detail:
        'Published CDN bandwidth, workspace, and domain allowances; feature value is excluded.',
    },
    {
      id: 'cloudflare',
      monthly: money(
        (Math.max(0, inputs.uniqueTransforms - 5000) / 1000) * 0.5,
      ),
      plan:
        inputs.uniqueTransforms <= 5000 ? 'Free transforms' : 'Paid transforms',
      status: 'partial',
      detail:
        'Remote-origin unique transforms only; hosted storage and delivery excluded.',
    },
    {
      id: 'bunny',
      monthly: money(
        inputs.projects * 9.5 + Math.max(1, inputs.deliveredGb * bunnyRate),
      ),
      plan: 'Optimizer + Bunny CDN',
      status: 'comparable',
      detail: `${inputs.projects} optimizer site${inputs.projects === 1 ? '' : 's'} plus ${inputs.region} regional CDN rate.`,
    },
    {
      id: 'vercel',
      monthly: money(vercelLow),
      monthlyHigh: money(vercelHigh),
      plan: 'Image meters only',
      status: 'partial',
      detail:
        'Excludes the Vercel plan, Fast Data Transfer, and Edge Requests.',
    },
    {
      id: 'imgproxy',
      monthly: 0,
      monthlyHigh: 49,
      plan: 'OSS license / Pro from $49',
      status: 'partial',
      detail:
        'Infrastructure, CDN, storage, monitoring, and operations are not publicly reducible to one total.',
    },
  ] as const
}
