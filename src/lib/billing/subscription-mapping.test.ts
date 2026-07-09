import { describe, expect, it } from 'vitest'
import {
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
    })
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
