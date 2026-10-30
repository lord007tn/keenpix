import dayjs from 'dayjs'
import { recordProjectFirstImageSuccesses } from '../data-access/activation'
import { recordFirstExternalImageInterruption } from '../data-access/image-measurement'
import { measurementPrisma } from '../index'

type Candidate = Parameters<typeof recordProjectFirstImageSuccesses>[0][number]

// No raw errors or request data cross this logging boundary.
export function createImageMeasurementBuffer(logger: {
  warn: (message: string) => unknown
}) {
  const queue: Candidate[] = []
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
    while (active < 2 && queue.length > 0) {
      const candidate = queue.shift()
      if (!candidate) {
        break
      }
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
      if (stopped || queue.length >= 256) {
        markLost(event.observedAt)
        return
      }
      queue.push(event)
      if (!scheduled) {
        scheduled = true
        setImmediate(pump)
      }
    },
    async shutdown() {
      stopped = true
      for (const candidate of queue) {
        markLost(candidate.observedAt)
      }
      queue.length = 0
      while (pending.size > 0) {
        await Promise.all(pending)
      }
      await persistInterruption()
    },
  }
}
