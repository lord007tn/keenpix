import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn())
const upsert = vi.hoisted(() => vi.fn())
vi.mock('@keenpix/database', () => {
  const subscriptionAddon = { findUnique, upsert }
  return {
    prisma: {
      $transaction: (fn: (tx: unknown) => unknown) =>
        Promise.resolve(fn({ subscriptionAddon })),
      subscriptionAddon,
    },
  }
})

const { getCustomDomainAddonUnits, upsertSubscriptionAddon } = await import(
  './subscription-addons'
)

const OLDER = new Date('2026-07-10T10:00:00Z')
const NEWER = new Date('2026-07-10T11:00:00Z')

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'custom_domains' as const,
    orgId: 'org_a',
    polarModifiedAt: NEWER,
    polarSubscriptionId: 'sub_addon_1',
    status: 'active',
    units: 5,
    ...overrides,
  }
}

beforeEach(() => {
  upsert.mockResolvedValue({})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('add-on webhook ordering', () => {
  it('does not resurrect a revoked add-on from a retried event', async () => {
    findUnique.mockResolvedValue({
      polarModifiedAt: OLDER,
      polarSubscriptionId: 'sub_addon_1',
      status: 'revoked',
    })

    await upsertSubscriptionAddon(snapshot())

    expect(upsert).not.toHaveBeenCalled()
  })

  it('drops an event older than the last applied event', async () => {
    findUnique.mockResolvedValue({
      polarModifiedAt: NEWER,
      polarSubscriptionId: 'sub_addon_1',
      status: 'active',
    })

    await upsertSubscriptionAddon(
      snapshot({ polarModifiedAt: OLDER, status: 'past_due' }),
    )

    expect(upsert).not.toHaveBeenCalled()
  })

  it('lets a new subscription replace the revoked row after repurchase', async () => {
    findUnique.mockResolvedValue({
      polarModifiedAt: NEWER,
      polarSubscriptionId: 'sub_addon_1',
      status: 'revoked',
    })

    await upsertSubscriptionAddon(
      snapshot({ polarModifiedAt: OLDER, polarSubscriptionId: 'sub_addon_2' }),
    )

    expect(upsert).toHaveBeenCalledOnce()
  })
})

describe('custom-domain add-on entitlement', () => {
  it('returns units only for entitled statuses', async () => {
    findUnique.mockResolvedValue({ status: 'active', units: 5 })
    await expect(getCustomDomainAddonUnits('org_a')).resolves.toBe(5)

    findUnique.mockResolvedValue({ status: 'revoked', units: 5 })
    await expect(getCustomDomainAddonUnits('org_a')).resolves.toBe(0)
  })
})
