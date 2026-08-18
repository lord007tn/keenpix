import { describe, expect, it, vi } from 'vitest'

const get = vi.hoisted(() => vi.fn())
const createPolarClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/billing/polar-client', () => ({ createPolarClient }))
vi.mock('@/lib/logger/logger', () => ({
  errorContext: vi.fn(),
  logger: { warn: vi.fn() },
}))

const { getPlatformFinance } = await import('./platform-finance')

describe('platform finance', () => {
  it('uses settled Polar revenue and recorded cost metrics', async () => {
    createPolarClient.mockReturnValue({ metrics: { get } })
    get.mockResolvedValue({
      metrics: { costs: {}, grossMargin: {} },
      totals: {
        revenue: 12_500,
        costs: 3200,
        grossMargin: 9300,
        grossMarginPercentage: 74.4,
        orders: 8,
      },
    })

    const result = await getPlatformFinance(
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-08-01T00:00:00Z'),
    )

    expect(result).toEqual({
      source: 'polar',
      revenueCents: 12_500,
      costCents: 3200,
      profitCents: 9300,
      profitMarginPct: 74.4,
      orders: 8,
    })
    expect(get).toHaveBeenCalledWith(
      expect.objectContaining({
        interval: 'day',
        metrics: expect.arrayContaining(['revenue', 'costs', 'gross_margin']),
        timezone: 'UTC',
      }),
    )
  })

  it('does not report zero costs when Cost Insights is not configured', async () => {
    createPolarClient.mockReturnValue({ metrics: { get } })
    get.mockResolvedValue({
      metrics: {},
      totals: { revenue: 2500, orders: 2 },
    })

    const result = await getPlatformFinance(
      new Date('2026-07-01T00:00:00Z'),
      new Date('2026-08-01T00:00:00Z'),
    )

    expect(result.revenueCents).toBe(2500)
    expect(result.costCents).toBeNull()
    expect(result.profitCents).toBeNull()
  })

  it('degrades cleanly when Polar is not configured', async () => {
    createPolarClient.mockReturnValue(null)

    await expect(
      getPlatformFinance(
        new Date('2026-07-01T00:00:00Z'),
        new Date('2026-08-01T00:00:00Z'),
      ),
    ).resolves.toEqual({
      source: 'unavailable',
      revenueCents: null,
      costCents: null,
      profitCents: null,
      profitMarginPct: null,
      orders: null,
    })
  })
})
