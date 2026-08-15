import { describe, expect, it, vi } from 'vitest'

const {
  loggerError,
  upsertSubscription,
  upsertSubscriptionAddon,
  upsertSubscriptionWithCustomer,
} = vi.hoisted(() => ({
  loggerError: vi.fn(),
  upsertSubscription: vi.fn(),
  upsertSubscriptionAddon: vi.fn(),
  upsertSubscriptionWithCustomer: vi.fn(),
}))

vi.mock('@/data-access/subscriptions', () => ({
  upsertSubscription,
  upsertSubscriptionWithCustomer,
}))
vi.mock('@/data-access/subscription-addons', () => ({
  upsertSubscriptionAddon,
}))
vi.mock('@/env/server', () => ({ env: {} }))
vi.mock('@/lib/billing/alerts', () => ({ notifyPaymentIssue: vi.fn() }))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: (error: unknown) => ({ error }),
  logger: { error: loggerError },
}))

const { syncSubscription } = await import('./polar-plugin')
const UNRECOGNIZED_PAYLOAD = /Unrecognized Polar subscription payload/

describe('Polar webhook subscription sync', () => {
  it('throws so Polar retries an unattributed or unknown valid payload', async () => {
    await expect(
      syncSubscription(
        {
          id: 'sub_unknown',
          metadata: {},
          product: { metadata: { plan: 'unknown' } },
          status: 'active',
        },
        'active',
      ),
    ).rejects.toThrow(UNRECOGNIZED_PAYLOAD)

    expect(upsertSubscription).not.toHaveBeenCalled()
    expect(upsertSubscriptionAddon).not.toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({ polarSubscriptionId: 'sub_unknown' }),
      expect.stringContaining('could not be attributed'),
    )
  })
})
