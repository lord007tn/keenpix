import dayjs from 'dayjs'
import { CalendarRangeIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { HistorySearch } from '@/helpers/history/window'
import type { HistoricalAnalyticsRange } from '@/shared/types'

export const HISTORY_RANGES: Array<{
  buttonLabel: string
  label: string
  value: HistoricalAnalyticsRange
}> = [
  { buttonLabel: '24 hours', label: 'Last 24 hours', value: '24h' },
  { buttonLabel: '7 days', label: 'Last 7 days', value: '7d' },
  { buttonLabel: '30 days', label: 'Last 30 days', value: '30d' },
  { buttonLabel: '90 days', label: 'Last 90 days', value: '90d' },
  { buttonLabel: '365 days', label: 'Last 365 days', value: '365d' },
  { buttonLabel: 'Custom', label: 'Custom dates', value: 'custom' },
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
  let visibleRange = range
  if (range === '365d' && maxDays < 365) {
    visibleRange = '90d'
  } else if (range === 'all') {
    visibleRange = maxDays >= 365 ? '365d' : '90d'
  }
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
  const [customOpen, setCustomOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(visibleFrom)
  const [draftTo, setDraftTo] = useState(visibleTo)
  const defaultCustomFrom = dayjs().subtract(9, 'day').isBefore(earliest, 'day')
    ? earliest
    : dayjs().subtract(9, 'day').format('YYYY-MM-DD')
  const draftIsValid =
    dayjs(draftFrom).isValid() &&
    dayjs(draftTo).isValid() &&
    !dayjs(draftFrom).isBefore(earliest, 'day') &&
    !dayjs(draftFrom).isAfter(draftTo, 'day') &&
    !dayjs(draftTo).isAfter(today, 'day')
  const presetRanges = HISTORY_RANGES.filter(
    (item) =>
      item.value !== 'custom' && (item.value !== '365d' || maxDays >= 365),
  )

  return (
    <fieldset className="flex min-h-11 flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
      <legend className="sr-only">{label} range</legend>
      {presetRanges.map((item) => (
        <Button
          aria-pressed={visibleRange === item.value}
          key={item.value}
          onClick={() =>
            onChange({
              range: item.value,
              from: undefined,
              to: undefined,
            })
          }
          size="sm"
          type="button"
          variant={visibleRange === item.value ? 'secondary' : 'ghost'}
        >
          {item.buttonLabel}
        </Button>
      ))}
      <Popover
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraftFrom(from ? visibleFrom : defaultCustomFrom)
            setDraftTo(to ? visibleTo : today)
          }
          setCustomOpen(nextOpen)
        }}
        open={customOpen}
      >
        <PopoverTrigger
          render={
            <Button
              aria-pressed={visibleRange === 'custom'}
              size="sm"
              type="button"
              variant={visibleRange === 'custom' ? 'secondary' : 'ghost'}
            />
          }
        >
          <CalendarRangeIcon aria-hidden="true" data-icon="inline-start" />
          Custom
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(22rem,calc(100vw-2rem))]"
          sideOffset={8}
        >
          <PopoverHeader>
            <PopoverTitle>Custom date range</PopoverTitle>
            <PopoverDescription>
              Select an inclusive range between{' '}
              {dayjs(earliest).format('MMM D, YYYY')} and today.
            </PopoverDescription>
          </PopoverHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!draftIsValid) {
                return
              }
              onChange({ range: 'custom', from: draftFrom, to: draftTo })
              setCustomOpen(false)
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${label.toLowerCase()}-start-date`}>
                  From
                </Label>
                <Input
                  aria-invalid={!draftIsValid}
                  autoComplete="off"
                  className="h-11"
                  id={`${label.toLowerCase()}-start-date`}
                  max={draftTo}
                  min={earliest}
                  name={`${label.toLowerCase()}-start-date`}
                  onChange={(event) => setDraftFrom(event.target.value)}
                  type="date"
                  value={draftFrom}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${label.toLowerCase()}-end-date`}>To</Label>
                <Input
                  aria-invalid={!draftIsValid}
                  autoComplete="off"
                  className="h-11"
                  id={`${label.toLowerCase()}-end-date`}
                  max={today}
                  min={draftFrom}
                  name={`${label.toLowerCase()}-end-date`}
                  onChange={(event) => setDraftTo(event.target.value)}
                  type="date"
                  value={draftTo}
                />
              </div>
            </div>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              {draftIsValid
                ? `${dayjs(draftFrom).format('MMM D, YYYY')} – ${dayjs(draftTo).format(dayjs(draftTo).isSame(dayjs(), 'year') ? 'MMM D' : 'MMM D, YYYY')} · ${dayjs(draftTo).diff(dayjs(draftFrom), 'day') + 1} days`
                : 'Choose a valid date range.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                className="h-11"
                onClick={() => setCustomOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button className="h-11" disabled={!draftIsValid} type="submit">
                Apply range
              </Button>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}
