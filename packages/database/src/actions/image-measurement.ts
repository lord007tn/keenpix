import dayjs from 'dayjs'
import { recordProjectFirstImageSuccesses } from '../data-access/activation'
import { recordFirstExternalImageInterruption } from '../data-access/image-measurement'
import { measurementPrisma } from '../index'

type Candidate = Parameters<typeof recordProjectFirstImageSuccesses>[0][number]

// No raw errors or request data cross this logging boundary.
export function createImageMeasurementBuffer(logger: {
  warn: (message: string) => unknown
}) {
  const queue = new Map<string, Candidate>()
  let active = 0
  let scheduled = false
  let stopped = false
  let lostFrom: Date | undefined
  let lostTo: Date | undefined
  const pending = new Set<Promise<void>>()

  function markLost(at = dayjs().toDate()) {
    if (!lostFrom || at < lostFrom) {
      lostFrom = at
    }
    const end = dayjs(at).add(1, 'millisecond').toDate()
    if (!lostTo || end > lostTo) {
      lostTo = end
    }
    if (lostFrom === at) {
      logger.warn('image measurement interrupted')
    }
  }

  async function run(candidate: Candidate) {
    try {
      await recordProjectFirstImageSuccesses([candidate], measurementPrisma)
    } catch {
      markLost(candidate.observedAt)
    }
    await persistInterruption()
  }

  async function persistInterruption() {
    // Coalesce failures into one bounded in-memory interval. If persistence also
    // fails, retain it for the next attempt. Unverified time is Unknown anyway.
    if (lostFrom && lostTo) {
      const from = lostFrom
      const to = lostTo
      try {
        await recordFirstExternalImageInterruption({ from, to })
        if (lostFrom === from && lostTo === to) {
          lostFrom = undefined
          lostTo = undefined
        }
      } catch {
        logger.warn('image measurement interruption persistence failed')
      }
    }
  }

  function pump() {
    scheduled = false
    while (active < 2 && queue.size > 0) {
      const entry = queue.entries().next().value
      if (!entry) {
        break
      }
      const [key, candidate] = entry
      queue.delete(key)
      active += 1
      const work = run(candidate)
        .catch(() => {
          // Includes unexpected driver/lifecycle errors; never leak an unhandled rejection.
          markLost(candidate.observedAt)
        })
        .finally(() => {
          active -= 1
          pending.delete(work)
          pump()
        })
      pending.add(work)
    }
  }

  return {
    enqueue(candidate: Candidate) {
      const event = {
        ...candidate,
        observedAt: candidate.observedAt ?? dayjs().toDate(),
      }
      const key = `${event.projectId}:${Boolean(event.external)}`
      const existing = queue.get(key)
      if (existing) {
        if (!existing.observedAt || event.observedAt < existing.observedAt) {
          queue.set(key, event)
        }
        return
      }
      if (stopped || queue.size >= 256) {
        markLost(event.observedAt)
        return
      }
      queue.set(key, event)
      if (!scheduled) {
        scheduled = true
        setImmediate(pump)
      }
    },
    async shutdown() {
      stopped = true
      for (const candidate of queue.values()) {
        markLost(candidate.observedAt)
      }
      queue.clear()
      while (pending.size > 0) {
        await Promise.all(pending)
      }
      await persistInterruption()
    },
  }
}
