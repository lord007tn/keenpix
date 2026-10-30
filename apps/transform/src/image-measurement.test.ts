import { expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ record: vi.fn(), persist: vi.fn() }))
vi.mock('@keenpix/database/activation', () => ({
  recordProjectFirstImageSuccesses: mocks.record,
}))
vi.mock('@keenpix/database', () => ({ measurementPrisma: {} }))
vi.mock('../../../packages/database/src/data-access/image-measurement', () => ({
  recordFirstExternalImageInterruption: mocks.persist,
}))

import { createImageMeasurementBuffer } from '../../../packages/database/src/actions/image-measurement'

it('caps active work at two, drops overflow, and persists shutdown losses', async () => {
  const releases: (() => void)[] = []
  mocks.record.mockImplementation(
    () => new Promise<void>((resolve) => releases.push(resolve)),
  )
  const warn = vi.fn()
  const buffer = createImageMeasurementBuffer({ warn })
  for (let i = 0; i < 300; i += 1) {
    buffer.enqueue({
      projectId: `synthetic-${i}`,
      orgId: 'synthetic',
      external: true,
    })
  }
  await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(2))
  expect(warn).toHaveBeenCalledWith('image measurement interrupted')
  const stop = buffer.shutdown()
  for (const release of releases) {
    release()
  }
  await stop
  expect(mocks.record).toHaveBeenCalledTimes(2)
  expect(mocks.persist).toHaveBeenCalled()
  expect(mocks.persist).toHaveBeenCalledWith({
    from: expect.any(Date),
    to: expect.any(Date),
  })
})

it('coalesces duplicate project/flag keys and retains the earliest observation', async () => {
  mocks.record.mockReset().mockResolvedValue(1)
  mocks.persist.mockClear()
  const warn = vi.fn()
  const buffer = createImageMeasurementBuffer({ warn })
  const late = new Date('2026-01-02T12:00:00Z')
  const early = new Date('2026-01-01T12:00:00Z')
  for (let i = 0; i < 1000; i += 1) {
    buffer.enqueue({
      projectId: 'synthetic',
      orgId: 'synthetic',
      external: true,
      observedAt: i === 500 ? early : late,
    })
  }
  await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledTimes(1))
  await buffer.shutdown()
  expect(mocks.record).toHaveBeenCalledWith(
    [expect.objectContaining({ observedAt: early })],
    expect.anything(),
  )
  expect(warn).not.toHaveBeenCalled()
  expect(mocks.persist).not.toHaveBeenCalled()
})
