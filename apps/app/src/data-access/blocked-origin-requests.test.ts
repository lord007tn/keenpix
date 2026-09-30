import dayjs from 'dayjs'
import { expect, it, vi } from 'vitest'

const { groupBy } = vi.hoisted(() => ({
  groupBy: vi.fn().mockResolvedValue([]),
}))
vi.mock('@keenpix/database', () => ({
  prisma: { analyticsRollupHourly: { groupBy } },
}))

import { listBlockedOriginRequests } from './blocked-origin-requests'

it('restricts warnings to tenant-scoped, repeated 403s with a known source host', async () => {
  const since = dayjs('2026-09-29T12:00:00Z').toDate()
  await listBlockedOriginRequests({
    orgId: 'org-a',
    projectId: 'project-a',
    since,
  })
  expect(groupBy).toHaveBeenCalledWith(
    expect.objectContaining({
      by: ['projectId', 'sourceHost'],
      where: {
        orgId: 'org-a',
        projectId: 'project-a',
        bucketStart: { gte: since },
        status: 403,
        sourceHost: { not: '' },
      },
      having: { requests: { _sum: { gte: 100 } } },
    }),
  )
})
