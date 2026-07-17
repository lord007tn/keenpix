import { describe, expect, it } from 'vitest'
import {
  mapSubscriptionAddonSnapshot,
  mapSubscriptionSnapshot,
  type PolarSubscriptionData,
} from './subscription-mapping'

const base: PolarSubscriptionData = {
  id: 'sub_1',
  status: 'active',
  currentPeriodStart: '2026-07-01T00:00:00.000Z',
  currentPeriodEnd: '2026-08-01T00:00:00.000Z',
  metadata: { orgId: 'org_a' },
  product: { metadata: { plan: 'pro' } },
  customer: { id: 'cus_1', externalId: 'org_a' },
}

describe('mapSubscriptionSnapshot', () => {
  it('maps a valid subscription onto a snapshot', () => {
    expect(mapSubscriptionSnapshot(base, 'active')).toEqual({
      orgId: 'org_a',
      polarSubscriptionId: 'sub_1',
      plan: 'pro',
      status: 'active',
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
      overageAllowed: false,
      cancelAtPeriodEnd: false,
      polarModifiedAt: null,
    })
  })

  it('carries the payload modified_at as the ordering key', () => {
    const snapshot = mapSubscriptionSnapshot(
      { ...base, modifiedAt: '2026-07-10T11:00:00.000Z' },
      'active',
    )
    expect(snapshot?.polarModifiedAt).toEqual(
      new Date('2026-07-10T11:00:00.000Z'),
    )
  })

  it('passes the explicit status through (e.g. canceled)', () => {
    expect(mapSubscriptionSnapshot(base, 'canceled')?.status).toBe('canceled')
  })

  it('defaults cancelAtPeriodEnd to false when the payload omits it', () => {
    expect(mapSubscriptionSnapshot(base, 'active')?.cancelAtPeriodEnd).toBe(
      false,
    )
  })

  it('mirrors cancel-at-period-end (active but not renewing)', () => {
    // Polar keeps status `active` on a cancel-at-period-end sub; the flag is what
    // distinguishes "ends {date}" from "renews {date}".
    const sub = { ...base, cancelAtPeriodEnd: true }
    expect(mapSubscriptionSnapshot(sub, 'active')?.cancelAtPeriodEnd).toBe(true)
  })

  it('resolves the org from metadata.referenceId when orgId is absent', () => {
    const sub = { ...base, metadata: { referenceId: 'org_b' } }
    expect(mapSubscriptionSnapshot(sub, 'active')?.orgId).toBe('org_b')
  })

  it('falls back to the customer external id for the org', () => {
    const sub = {
      ...base,
      metadata: {},
      customer: { id: 'cus_1', externalId: 'org_c' },
    }
    expect(mapSubscriptionSnapshot(sub, 'active')?.orgId).toBe('org_c')
  })

  it('returns null for an unknown plan metadata', () => {
    const sub = { ...base, product: { metadata: { plan: 'enterprise' } } }
    expect(mapSubscriptionSnapshot(sub, 'active')).toBeNull()
  })

  it('returns null when there is no org link at all', () => {
    const sub = {
      ...base,
      metadata: {},
      customer: { id: 'cus_1', externalId: null },
    }
    expect(mapSubscriptionSnapshot(sub, 'active')).toBeNull()
  })
})

describe('mapSubscriptionAddonSnapshot', () => {
  it('maps the configured custom-domain pack without replacing the plan', () => {
    const addon = {
      ...base,
      id: 'sub_addon',
      product: {
        metadata: { addon: 'custom_domains', units: '5' },
      },
    }

    expect(mapSubscriptionAddonSnapshot(addon, 'active')).toEqual({
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-07-01T00:00:00.000Z'),
      kind: 'custom_domains',
      orgId: 'org_a',
      polarModifiedAt: null,
      polarSubscriptionId: 'sub_addon',
      status: 'active',
      units: 5,
    })
    expect(mapSubscriptionSnapshot(addon, 'active')).toBeNull()
  })

  it('rejects unknown add-ons and altered pack sizes', () => {
    expect(
      mapSubscriptionAddonSnapshot(
        {
          ...base,
          product: { metadata: { addon: 'custom_domains', units: 10 } },
        },
        'active',
      ),
    ).toBeNull()
    expect(
      mapSubscriptionAddonSnapshot(
        {
          ...base,
          product: { metadata: { addon: 'storage', units: 5 } },
        },
        'active',
      ),
    ).toBeNull()
  })
})
