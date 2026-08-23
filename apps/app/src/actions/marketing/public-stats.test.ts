import { describe, expect, it, vi } from 'vitest'

const { getPlatformSuccessfulDeliveryCount } = vi.hoisted(() => ({
  getPlatformSuccessfulDeliveryCount: vi.fn(),
}))

vi.mock('@/data-access/usage', () => ({
  getPlatformSuccessfulDeliveryCount,
}))

const { getPublicStats } = await import('./public-stats')

describe('getPublicStats', () => {
  it('caches the production aggregate instead of querying on every visit', async () => {
    getPlatformSuccessfulDeliveryCount.mockResolvedValue(17_099_838)

    await expect(getPublicStats()).resolves.toEqual({
      deliveredImages: 17_099_838,
    })
    await expect(getPublicStats()).resolves.toEqual({
      deliveredImages: 17_099_838,
    })
    expect(getPlatformSuccessfulDeliveryCount).toHaveBeenCalledOnce()
  })
})
