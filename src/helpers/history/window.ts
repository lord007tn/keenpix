import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import type { HistoricalAnalyticsRange } from '@/shared/types'

export interface HistorySearch {
  from?: string
  range: HistoricalAnalyticsRange
  to?: string
}

dayjs.extend(utc)

// Apply a cloud plan's rolling history ceiling without trusting the browser.
// "All available" becomes the full retained plan window; self-host callers omit
// maxDays and retain their unbounded all-time behavior.
export function limitHistorySearch(
  input: HistorySearch,
  maxDays?: number,
  current = dayjs.utc(),
): HistorySearch {
  const now = current.utc()
  if (!maxDays) {
    return input
  }
  const days = Math.max(1, maxDays)
  const earliest = now
    .startOf('day')
    .subtract(days - 1, 'day')
    .format('YYYY-MM-DD')
  const today = now.format('YYYY-MM-DD')

  if (input.range === 'all') {
    return { range: 'custom', from: earliest, to: today }
  }
  let presetDays = 0
  if (input.range === '365d') {
    presetDays = 365
  } else if (input.range === '90d') {
    presetDays = 90
  } else if (input.range === '30d') {
    presetDays = 30
  } else if (input.range === '7d') {
    presetDays = 7
  }
  if (presetDays > days) {
    if (days === 90) {
      return { range: '90d' }
    }
    if (days === 30) {
      return { range: '30d' }
    }
    if (days === 7) {
      return { range: '7d' }
    }
    return { range: 'custom', from: earliest, to: today }
  }
  if (input.range !== 'custom') {
    return input
  }

  let from = input.from ?? earliest
  let to = input.to ?? today
  if (dayjs(from).isBefore(earliest, 'day')) {
    from = earliest
  }
  if (dayjs(to).isBefore(earliest, 'day')) {
    to = earliest
  } else if (dayjs(to).isAfter(today, 'day')) {
    to = today
  }
  if (dayjs(from).isAfter(to, 'day')) {
    from = to
  }
  return { range: 'custom', from, to }
}

export function getHistoryWindowDates(
  input: HistorySearch,
  current = dayjs.utc(),
) {
  const now = current.utc()
  if (input.range === 'all') {
    return { gte: undefined, lt: now.add(1, 'millisecond').toDate() }
  }
  if (input.range === 'custom') {
    return {
      gte: dayjs.utc(input.from).startOf('day').toDate(),
      lt: dayjs.utc(input.to).startOf('day').add(1, 'day').toDate(),
    }
  }
  if (input.range === '24h') {
    return {
      gte: now.subtract(24, 'hour').toDate(),
      lt: now.add(1, 'millisecond').toDate(),
    }
  }
  let days = 7
  if (input.range === '30d') {
    days = 30
  } else if (input.range === '90d') {
    days = 90
  } else if (input.range === '365d') {
    days = 365
  }
  return {
    gte: now
      .startOf('day')
      .subtract(days - 1, 'day')
      .toDate(),
    lt: now.add(1, 'millisecond').toDate(),
  }
}
