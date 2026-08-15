import { beforeEach, describe, expect, it, vi } from 'vitest'

const getOldestPaidUsageReportAt = vi.hoisted(() => vi.fn())

vi.mock('@/data-access/usage', () => ({ getOldestPaidUsageReportAt }))

const { verifyUsageCaptureCoverage } = await import('./verify-usage-coverage')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('billing edge coverage', () => {
  it('rejects a watermark stranded before the recoverable capture window', async () => {
    getOldestPaidUsageReportAt.mockResolvedValue(
      new Date('2026-08-13T02:00:00Z'),
    )

    await expect(
      verifyUsageCaptureCoverage({
        coveredFrom: new Date('2026-08-14T04:00:00Z'),
        coveredUntil: new Date('2026-08-15T04:00:00Z'),
        through: new Date('2026-08-15T03:00:00Z'),
      }),
    ).rejects.toThrow('does not contain every pending billing window')
  })

  it('accepts pending windows fully contained by project-edge coverage', async () => {
    getOldestPaidUsageReportAt.mockResolvedValue(
      new Date('2026-08-14T05:00:00Z'),
    )

    await expect(
      verifyUsageCaptureCoverage({
        coveredFrom: new Date('2026-08-14T04:00:00Z'),
        coveredUntil: new Date('2026-08-15T04:00:00Z'),
        through: new Date('2026-08-15T03:00:00Z'),
      }),
    ).resolves.toEqual({ required: true })
  })
})
