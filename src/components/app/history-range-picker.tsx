import dayjs from 'dayjs'
import { CalendarRangeIcon } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
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
import { Separator } from '@/components/ui/separator'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  { buttonLabel: 'All time', label: 'All available', value: 'all' },
  { buttonLabel: 'Custom', label: 'Custom range', value: 'custom' },
]

function getHistoricalRangeDates(
  range: Exclude<HistoricalAnalyticsRange, 'custom'>,
  earliest: string,
  today: string,
) {
  if (range === 'all') {
    return { from: earliest, to: today }
  }
  if (range === '24h') {
    return { from: today, to: today }
  }
  let days = 7
  if (range === '30d') {
    days = 30
  } else if (range === '90d') {
    days = 90
  } else if (range === '365d') {
    days = 365
  }
  const from = dayjs(today).subtract(days - 1, 'day')
  return {
    from: from.isBefore(earliest, 'day') ? earliest : from.format('YYYY-MM-DD'),
    to: today,
  }
}

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

  const appliedDates =
    visibleRange === 'custom'
      ? { from: visibleFrom, to: visibleTo }
      : getHistoricalRangeDates(visibleRange, earliest, today)
  const inputId = `${label.toLowerCase().replaceAll(' ', '-')}-history`

  const [customOpen, setCustomOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>()
  const [calendarMonth, setCalendarMonth] = useState(
    dayjs(today).subtract(1, 'month').startOf('month').toDate(),
  )
  const draftFrom = draftRange?.from
  const draftTo = draftRange?.to
  const draftIsValid = Boolean(
    draftFrom &&
      draftTo &&
      !dayjs(draftFrom).isBefore(earliest, 'day') &&
      !dayjs(draftFrom).isAfter(draftTo, 'day') &&
      !dayjs(draftTo).isAfter(today, 'day'),
  )
  const presetRanges = HISTORY_RANGES.filter(
    (item) =>
      item.value !== 'custom' && (item.value !== '365d' || maxDays >= 365),
  )

  const appliedCustomLabel =
    visibleRange === 'custom' && from && to
      ? `${dayjs(from).format('MMM D')}–${dayjs(to).format(
          dayjs(from).isSame(to, 'year') ? 'MMM D' : 'MMM D, YYYY',
        )}`
      : 'Custom'
  let draftSummary = 'Select a start date.'
  if (draftFrom && draftTo) {
    draftSummary = `${dayjs(draftFrom).format('MMM D, YYYY')} – ${dayjs(draftTo).format('MMM D, YYYY')} · ${dayjs(draftTo).diff(dayjs(draftFrom), 'day') + 1} days`
  } else if (draftFrom) {
    draftSummary = `${dayjs(draftFrom).format('MMM D, YYYY')} — select an end date`
  }

  return (
    <fieldset className="min-h-11 rounded-lg border border-border bg-muted/40 p-1">
      <legend className="sr-only">{label} range</legend>
      <Popover
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setDraftRange({
              from: dayjs(appliedDates.from).toDate(),
              to: dayjs(appliedDates.to).toDate(),
            })
            setCalendarMonth(
              dayjs(appliedDates.to)
                .subtract(1, 'month')
                .startOf('month')
                .toDate(),
            )
          }
          setCustomOpen(nextOpen)
        }}
        open={customOpen}
      >
        <ToggleGroup
          aria-label={`${label} date range`}
          className="flex-wrap gap-1"
          onValueChange={(values) => {
            const next = values[0]
            const preset = presetRanges.find((item) => item.value === next)
            if (!preset) {
              return
            }
            setCustomOpen(false)
            onChange({ range: preset.value, from: undefined, to: undefined })
          }}
          size="sm"
          value={[visibleRange]}
        >
          {presetRanges.map((item) => (
            <ToggleGroupItem
              className="h-11"
              key={item.value}
              value={item.value}
            >
              {item.buttonLabel}
            </ToggleGroupItem>
          ))}
          <PopoverTrigger
            render={
              <ToggleGroupItem
                aria-label={
                  visibleRange === 'custom' && from && to
                    ? `Custom range, ${dayjs(from).format('MMMM D, YYYY')} to ${dayjs(to).format('MMMM D, YYYY')}, selected`
                    : 'Choose a custom date range'
                }
                className="h-11 aria-expanded:bg-accent aria-expanded:text-accent-foreground"
                value="custom"
              />
            }
          >
            <CalendarRangeIcon aria-hidden="true" data-icon="inline-start" />
            {appliedCustomLabel}
          </PopoverTrigger>
        </ToggleGroup>

        <PopoverContent
          align="end"
          className="max-h-[calc(100vh-1rem)] w-[37rem] max-w-[calc(100vw-1rem)] gap-0 overflow-y-auto p-0"
          sideOffset={8}
        >
          <PopoverHeader className="border-b px-4 py-3">
            <PopoverTitle>Custom date range</PopoverTitle>
            <PopoverDescription>
              Select an inclusive range between{' '}
              {dayjs(earliest).format('MMM D, YYYY')} and today.
            </PopoverDescription>
          </PopoverHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!(draftIsValid && draftFrom && draftTo)) {
                return
              }
              onChange({
                range: 'custom',
                from: dayjs(draftFrom).format('YYYY-MM-DD'),
                to: dayjs(draftTo).format('YYYY-MM-DD'),
              })
              setCustomOpen(false)
            }}
          >
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-3 border-b p-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${inputId}-date-from`}>Start date</Label>
                  <Input
                    id={`${inputId}-date-from`}
                    max={dayjs(draftTo ?? today).format('YYYY-MM-DD')}
                    min={earliest}
                    onChange={(event) => {
                      const nextFrom = event.target.value
                      setDraftRange({
                        from: nextFrom ? dayjs(nextFrom).toDate() : undefined,
                        to: draftTo,
                      })
                      if (nextFrom) {
                        setCalendarMonth(
                          dayjs(nextFrom).startOf('month').toDate(),
                        )
                      }
                    }}
                    type="date"
                    value={
                      draftFrom ? dayjs(draftFrom).format('YYYY-MM-DD') : ''
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`${inputId}-date-to`}>End date</Label>
                  <Input
                    id={`${inputId}-date-to`}
                    max={today}
                    min={
                      draftFrom
                        ? dayjs(draftFrom).format('YYYY-MM-DD')
                        : earliest
                    }
                    onChange={(event) => {
                      const nextTo = event.target.value
                      setDraftRange({
                        from: draftFrom,
                        to: nextTo ? dayjs(nextTo).toDate() : undefined,
                      })
                    }}
                    type="date"
                    value={draftTo ? dayjs(draftTo).format('YYYY-MM-DD') : ''}
                  />
                </div>
              </div>

              <Calendar
                captionLayout="dropdown"
                className="mx-auto p-3 [--cell-size:--spacing(8)]"
                disabled={{
                  before: dayjs(earliest).toDate(),
                  after: dayjs(today).toDate(),
                }}
                endMonth={dayjs(today).toDate()}
                mode="range"
                month={calendarMonth}
                numberOfMonths={2}
                onMonthChange={setCalendarMonth}
                onSelect={setDraftRange}
                selected={draftRange}
                showOutsideDays={false}
                startMonth={dayjs(earliest).toDate()}
              />
            </div>

            <Separator />
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p aria-live="polite" className="text-muted-foreground text-sm">
                {draftSummary}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setCustomOpen(false)}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={!draftIsValid} type="submit">
                  Apply range
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}
