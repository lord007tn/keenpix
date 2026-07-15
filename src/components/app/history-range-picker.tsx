import dayjs from 'dayjs'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { HistorySearch } from '@/helpers/history/window'
import type { HistoricalAnalyticsRange } from '@/shared/types'

export const HISTORY_RANGES: Array<{
  label: string
  value: HistoricalAnalyticsRange
}> = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 365 days', value: '365d' },
  { label: 'All available', value: 'all' },
  { label: 'Custom dates', value: 'custom' },
]

export function HistoryRangePicker({
  from,
  label,
  maxDays,
  onChange,
  range,
  to,
}: HistorySearch & {
  label: string
  maxDays: number
  onChange: (next: HistorySearch) => void
}) {
  const today = dayjs().format('YYYY-MM-DD')
  const earliest = dayjs()
    .subtract(Math.max(1, maxDays) - 1, 'day')
    .format('YYYY-MM-DD')
  const visibleRange = range === '365d' && maxDays < 365 ? '90d' : range
  let visibleTo = to ?? today
  if (dayjs(visibleTo).isBefore(earliest, 'day')) {
    visibleTo = earliest
  } else if (dayjs(visibleTo).isAfter(today, 'day')) {
    visibleTo = today
  }
  let visibleFrom = from ?? earliest
  if (
    dayjs(visibleFrom).isBefore(earliest, 'day') ||
    dayjs(visibleFrom).isAfter(visibleTo, 'day')
  ) {
    visibleFrom = earliest
  }

  return (
    <>
      <Select
        onValueChange={(value) => {
          const next = HISTORY_RANGES.find(
            (item) => item.value === value,
          )?.value
          if (!next) {
            return
          }
          onChange({
            range: next,
            from:
              next === 'custom'
                ? (from ?? dayjs().subtract(9, 'day').format('YYYY-MM-DD'))
                : undefined,
            to: next === 'custom' ? (to ?? today) : undefined,
          })
        }}
        value={visibleRange}
      >
        <SelectTrigger aria-label={`${label} range`} className="w-40" size="lg">
          <SelectValue>
            {(value) =>
              HISTORY_RANGES.find((item) => item.value === value)?.label ??
              String(value)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HISTORY_RANGES.filter(
            (item) => item.value !== '365d' || maxDays >= 365,
          ).map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {visibleRange === 'custom' ? (
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:w-auto">
          <Input
            aria-label={`${label} start date`}
            autoComplete="off"
            className="h-11 w-full min-w-0 sm:w-36"
            max={visibleTo}
            min={earliest}
            name={`${label.toLowerCase()}-start-date`}
            onChange={(event) =>
              onChange({
                range: 'custom',
                from: event.target.value,
                to: visibleTo,
              })
            }
            type="date"
            value={visibleFrom}
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            aria-label={`${label} end date`}
            autoComplete="off"
            className="h-11 w-full min-w-0 sm:w-36"
            max={today}
            min={visibleFrom}
            name={`${label.toLowerCase()}-end-date`}
            onChange={(event) =>
              onChange({
                range: 'custom',
                from: visibleFrom,
                to: event.target.value,
              })
            }
            type="date"
            value={visibleTo}
          />
        </div>
      ) : null}
    </>
  )
}
