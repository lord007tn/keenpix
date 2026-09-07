// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { OperationsHealth } from './operations-health'

const mocks = vi.hoisted(() => ({ read: vi.fn(), trend: vi.fn() }))
vi.mock('@/functions/admin', () => ({
  getOperationsHealthFn: mocks.read,
  getResourceTrendFn: mocks.trend,
  runCacheMaintenanceFn: vi.fn(),
}))

const snapshot = {
  cache: {
    cacheTiers: ['memory', 'object'],
    diskMaxBytes: 2048,
    memorySizeBytes: 0,
    memoryMaxBytes: 1024,
    memoryItemCount: 0,
  },
  cacheHits: { hitRate: null, totalRequests: 0 },
  prewarmQueue: { status: 'ready', queued: 0, failed: 0, active: 0 },
  projectCount: 3,
  generatedAt: '2026-09-07T20:00:00Z',
  uptimeSeconds: 60,
}

const container = document.createElement('div')
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  root = createRoot(container)
  mocks.read.mockResolvedValue(snapshot)
  mocks.trend.mockResolvedValue({ points: [] })
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it('identifies object-backed storage without inventing empty disk metrics', async () => {
  await act(async () =>
    root.render(createElement(OperationsHealth, { cloud: false })),
  )
  expect(container.textContent).toContain('Local disk cache is not configured')
  expect(container.querySelector('[aria-label="Disk cache usage"]')).toBeNull()
  expect(container.textContent).not.toContain('NaN')
  expect(container.textContent).not.toContain('Clear disk')
  expect(container.textContent).not.toContain('no evictions')
})

for (const size of [0, 512]) {
  it(`renders measured disk usage of ${size} bytes`, async () => {
    mocks.read.mockResolvedValue({
      ...snapshot,
      cache: {
        ...snapshot.cache,
        cacheTiers: ['memory', 'disk'],
        diskSizeBytes: size,
        diskFileCount: 0,
      },
    })
    await act(async () =>
      root.render(createElement(OperationsHealth, { cloud: true })),
    )
    expect(
      container
        .querySelector('[aria-label="Disk cache usage"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe(String((size / 2048) * 100))
    expect(container.textContent).not.toContain('unavailable')
  })
}

for (const metrics of [
  { diskMaxBytes: 0, diskSizeBytes: 0, diskFileCount: 0 },
  { diskMaxBytes: undefined, diskSizeBytes: 0, diskFileCount: 0 },
  { diskMaxBytes: 2048, diskSizeBytes: undefined, diskFileCount: 0 },
  { diskMaxBytes: 2048, diskSizeBytes: -1, diskFileCount: 0 },
  { diskMaxBytes: 2048, diskSizeBytes: Number.NaN, diskFileCount: 0 },
  { diskMaxBytes: 2048, diskSizeBytes: 0, diskFileCount: undefined },
]) {
  it(`shows unavailable for invalid disk metrics ${JSON.stringify(metrics)}`, async () => {
    mocks.read.mockResolvedValue({
      ...snapshot,
      cache: { ...snapshot.cache, cacheTiers: ['disk'], ...metrics },
    })
    await act(async () =>
      root.render(createElement(OperationsHealth, { cloud: true })),
    )
    expect(container.textContent).toContain('Disk cache usage unavailable')
    expect(
      container.querySelector('[aria-label="Disk cache usage"]'),
    ).toBeNull()
    expect(container.textContent).not.toContain('NaN')
  })
}

it('shows loading until the first snapshot arrives', async () => {
  let resolveSnapshot: (value: typeof snapshot) => void = () => undefined
  const response = new Promise((resolve) => {
    resolveSnapshot = resolve
  })
  mocks.read.mockReturnValue(response)
  await act(async () =>
    root.render(createElement(OperationsHealth, { cloud: true })),
  )
  expect(container.textContent).toContain('Loading operations')
  expect(container.querySelector('[role="progressbar"]')).toBeNull()
  await act(async () => resolveSnapshot(snapshot))
  expect(container.textContent).toContain('3 projects')
})

it('recovers from initial failure using Retry', async () => {
  mocks.read.mockRejectedValueOnce(new Error('offline'))
  await act(async () =>
    root.render(createElement(OperationsHealth, { cloud: true })),
  )
  expect(container.textContent).toContain('Operations data unavailable')
  await act(async () => container.querySelector('button')?.click())
  expect(container.textContent).toContain('3 projects')
  expect(container.textContent).not.toContain('Operations data unavailable')
})

it('labels a retained snapshot after failed Refresh and clears the warning on recovery', async () => {
  await act(async () =>
    root.render(createElement(OperationsHealth, { cloud: true })),
  )
  mocks.read.mockRejectedValueOnce(new Error('offline'))
  await act(async () => container.querySelector('button')?.click())
  expect(container.textContent).toContain(
    'Showing the last successful snapshot',
  )
  expect(container.textContent).toContain(snapshot.generatedAt)
  await act(async () => container.querySelector('button')?.click())
  expect(container.textContent).not.toContain('Refresh failed')
})
