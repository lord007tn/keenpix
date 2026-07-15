import dayjs from 'dayjs'
import { CalendarRangeIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  { buttonLabel: 'All', label: 'All available', value: 'all' },
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
    <>
      <fieldset className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-1">
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
        <Button
          aria-pressed={visibleRange === 'custom'}
          onClick={() => {
            setDraftFrom(from ? visibleFrom : defaultCustomFrom)
            setDraftTo(to ? visibleTo : today)
            setCustomOpen(true)
          }}
          size="sm"
          type="button"
          variant={visibleRange === 'custom' ? 'secondary' : 'ghost'}
        >
          <CalendarRangeIcon aria-hidden="true" data-icon="inline-start" />
          Custom
        </Button>
      </fieldset>

      <Dialog onOpenChange={setCustomOpen} open={customOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
            <DialogDescription>
              Select an inclusive range between{' '}
              {dayjs(earliest).format('MMM D, YYYY')} and today.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${label.toLowerCase()}-start-date`}>From</Label>
              <Input
                autoComplete="off"
                id={`${label.toLowerCase()}-start-date`}
                max={draftTo}
                min={earliest}
                onChange={(event) => setDraftFrom(event.target.value)}
                type="date"
                value={draftFrom}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${label.toLowerCase()}-end-date`}>To</Label>
              <Input
                autoComplete="off"
                id={`${label.toLowerCase()}-end-date`}
                max={today}
                min={draftFrom}
                onChange={(event) => setDraftTo(event.target.value)}
                type="date"
                value={draftTo}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-muted-foreground text-sm">
            {draftIsValid
              ? `${dayjs(draftFrom).format('MMM D, YYYY')} – ${dayjs(draftTo).format('MMM D, YYYY')} · ${dayjs(draftTo).diff(dayjs(draftFrom), 'day') + 1} days`
              : 'Choose a valid date range.'}
          </div>
          <DialogFooter>
            <Button
              onClick={() => setCustomOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!draftIsValid}
              onClick={() => {
                onChange({
                  range: 'custom',
                  from: draftFrom,
                  to: draftTo,
                })
                setCustomOpen(false)
              }}
              type="button"
            >
              Apply range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
