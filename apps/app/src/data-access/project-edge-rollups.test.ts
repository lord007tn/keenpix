import { beforeEach, describe, expect, it, vi } from 'vitest'

const { attributionFindMany, executeRaw, projectFindMany } = vi.hoisted(() => ({
  attributionFindMany: vi.fn(),
  executeRaw: vi.fn(),
  projectFindMany: vi.fn(),
}))

vi.mock('@keenpix/database', () => ({
  prisma: {
    $executeRaw: executeRaw,
    project: { findMany: projectFindMany },
    projectBillingAttribution: { findMany: attributionFindMany },
  },
}))

const { upsertProjectEdgeRollups } = await import('./project-edge-rollups')

beforeEach(() => {
  vi.clearAllMocks()
  executeRaw.mockResolvedValue(1)
  projectFindMany.mockResolvedValue([])
  attributionFindMany.mockResolvedValue([])
})

describe('project edge rollup attribution', () => {
  it('retains delayed edge usage after the mutable project is deleted', async () => {
    attributionFindMany.mockResolvedValue([
      { orgId: 'org_1', projectId: 'project_deleted' },
    ])

    await expect(
      upsertProjectEdgeRollups([
        {
          bucketStart: '2026-08-15T03:00:00Z',
          bytes: 2048,
          cacheStatus: 'hit',
          host: 'cdn.keenpix.com',
          projectId: 'project_deleted',
          requests: 1,
          stage: 'edge',
          status: 200,
        },
      ]),
    ).resolves.toBe(1)

    expect(executeRaw).toHaveBeenCalledOnce()
  })
})
