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
import { cn } from '@/lib/cn/utils'
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

export const PRIMARY_HISTORY_RANGES = HISTORY_RANGES.filter(
  (item) => item.value === '24h' || item.value === '7d' || item.value === '30d',
)

export type HistoryShortcutValue =
  | Exclude<HistoricalAnalyticsRange, 'custom'>
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'this-month'
  | 'last-month'
  | 'year-to-date'
  | 'last-calendar-year'

export const HISTORY_SHORTCUTS: Array<{
  label: string
  value: HistoryShortcutValue
}> = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This week', value: 'this-week' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month', value: 'this-month' },
  { label: 'Last month', value: 'last-month' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 365 days', value: '365d' },
  { label: 'Year to date', value: 'year-to-date' },
  { label: 'Last calendar year', value: 'last-calendar-year' },
  { label: 'All available', value: 'all' },
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

export function getHistoryShortcutDates(
  shortcut: HistoryShortcutValue,
  earliest: string,
  today: string,
) {
  if (
    shortcut === '24h' ||
    shortcut === '7d' ||
    shortcut === '30d' ||
    shortcut === '90d' ||
    shortcut === '365d' ||
    shortcut === 'all'
  ) {
    return getHistoricalRangeDates(shortcut, earliest, today)
  }
  if (shortcut === 'today') {
    return { from: today, to: today }
  }
  if (shortcut === 'yesterday') {
    const yesterday = dayjs(today).subtract(1, 'day').format('YYYY-MM-DD')
    return { from: yesterday, to: yesterday }
  }
  if (shortcut === 'this-week') {
    return {
      from: dayjs(today).startOf('week').format('YYYY-MM-DD'),
      to: today,
    }
  }
  if (shortcut === 'this-month') {
    return {
      from: dayjs(today).startOf('month').format('YYYY-MM-DD'),
      to: today,
    }
  }
  if (shortcut === 'last-month') {
    const lastMonth = dayjs(today).subtract(1, 'month')
    return {
      from: lastMonth.startOf('month').format('YYYY-MM-DD'),
      to: lastMonth.endOf('month').format('YYYY-MM-DD'),
    }
  }
  if (shortcut === 'last-calendar-year') {
    const lastYear = dayjs(today).subtract(1, 'year')
    return {
      from: lastYear.startOf('year').format('YYYY-MM-DD'),
      to: lastYear.endOf('year').format('YYYY-MM-DD'),
    }
  }
  return { from: dayjs(today).startOf('year').format('YYYY-MM-DD'), to: today }
}

function isHistoricalPreset(
  value: HistoryShortcutValue | 'custom',
): value is Exclude<HistoricalAnalyticsRange, 'custom'> {
  return (
    value === '24h' ||
    value === '7d' ||
    value === '30d' ||
    value === '90d' ||
    value === '365d' ||
    value === 'all'
  )
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
  const [selectedShortcut, setSelectedShortcut] = useState<
    HistoryShortcutValue | 'custom'
  >('custom')
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
  const availableShortcuts = HISTORY_SHORTCUTS.filter((item) => {
    if (item.value === '90d' && maxDays < 90) {
      return false
    }
    if (item.value === '365d' && maxDays < 365) {
      return false
    }
    const dates = getHistoryShortcutDates(item.value, earliest, today)
    return !dayjs(dates.from).isBefore(earliest, 'day')
  })

  let dropdownLabel = 'Custom'
  if (visibleRange === 'custom' && from && to) {
    dropdownLabel = `${dayjs(from).format('MMM D')}–${dayjs(to).format(
      dayjs(from).isSame(to, 'year') ? 'MMM D' : 'MMM D, YYYY',
    )}`
  } else if (
    visibleRange !== '24h' &&
    visibleRange !== '7d' &&
    visibleRange !== '30d' &&
    visibleRange !== 'custom'
  ) {
    dropdownLabel =
      HISTORY_RANGES.find((item) => item.value === visibleRange)?.label ??
      'Custom'
  }
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
            setSelectedShortcut(
              visibleRange === 'custom' ? 'custom' : visibleRange,
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
            const preset = PRIMARY_HISTORY_RANGES.find(
              (item) => item.value === next,
            )
            if (!preset) {
              return
            }
            setCustomOpen(false)
            onChange({ range: preset.value, from: undefined, to: undefined })
          }}
          size="sm"
          value={[
            visibleRange === '24h' ||
            visibleRange === '7d' ||
            visibleRange === '30d'
              ? visibleRange
              : 'custom',
          ]}
        >
          {PRIMARY_HISTORY_RANGES.map((item) => (
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
                  visibleRange !== '24h' &&
                  visibleRange !== '7d' &&
                  visibleRange !== '30d'
                    ? `${dropdownLabel}, selected. Choose a date range`
                    : 'Choose a custom date range'
                }
                className="h-11 aria-expanded:bg-accent aria-expanded:text-accent-foreground"
                value="custom"
              />
            }
          >
            <CalendarRangeIcon aria-hidden="true" data-icon="inline-start" />
            {dropdownLabel}
          </PopoverTrigger>
        </ToggleGroup>

        <PopoverContent
          align="end"
          className="max-h-[calc(100dvh-1rem)] w-[50rem] max-w-[calc(100vw-1rem)] gap-0 overflow-hidden p-0"
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
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault()
              if (!(draftIsValid && draftFrom && draftTo)) {
                return
              }
              if (isHistoricalPreset(selectedShortcut)) {
                onChange({
                  range: selectedShortcut,
                  from: undefined,
                  to: undefined,
                })
              } else {
                onChange({
                  range: 'custom',
                  from: dayjs(draftFrom).format('YYYY-MM-DD'),
                  to: dayjs(draftTo).format('YYYY-MM-DD'),
                })
              }
              setCustomOpen(false)
            }}
          >
            <div className="grid min-h-0 flex-1 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <nav
                aria-label="Date range shortcuts"
                className="flex gap-1 overflow-x-auto overscroll-contain border-b p-2 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:border-r sm:border-b-0"
              >
                {availableShortcuts.map((shortcut) => (
                  <Button
                    aria-pressed={selectedShortcut === shortcut.value}
                    className={cn(
                      'h-9 shrink-0 justify-start',
                      selectedShortcut === shortcut.value &&
                        'bg-accent text-accent-foreground',
                    )}
                    key={shortcut.value}
                    onClick={() => {
                      const dates = getHistoryShortcutDates(
                        shortcut.value,
                        earliest,
                        today,
                      )
                      setSelectedShortcut(shortcut.value)
                      if (isHistoricalPreset(shortcut.value)) {
                        onChange({
                          range: shortcut.value,
                          from: undefined,
                          to: undefined,
                        })
                      } else {
                        onChange({
                          range: 'custom',
                          from: dates.from,
                          to: dates.to,
                        })
                      }
                      setCustomOpen(false)
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    {shortcut.label}
                  </Button>
                ))}
              </nav>

              <div className="min-w-0 overflow-y-auto overscroll-contain">
                <div className="grid grid-cols-1 gap-3 border-b p-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`${inputId}-date-from`}>Start date</Label>
                    <Input
                      autoComplete="off"
                      id={`${inputId}-date-from`}
                      max={dayjs(draftTo ?? today).format('YYYY-MM-DD')}
                      min={earliest}
                      name="from"
                      onChange={(event) => {
                        const nextFrom = event.target.value
                        setDraftRange({
                          from: nextFrom ? dayjs(nextFrom).toDate() : undefined,
                          to: draftTo,
                        })
                        setSelectedShortcut('custom')
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
                      autoComplete="off"
                      id={`${inputId}-date-to`}
                      max={today}
                      min={
                        draftFrom
                          ? dayjs(draftFrom).format('YYYY-MM-DD')
                          : earliest
                      }
                      name="to"
                      onChange={(event) => {
                        const nextTo = event.target.value
                        setDraftRange({
                          from: draftFrom,
                          to: nextTo ? dayjs(nextTo).toDate() : undefined,
                        })
                        setSelectedShortcut('custom')
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
                  onSelect={(nextRange) => {
                    setDraftRange(nextRange)
                    setSelectedShortcut('custom')
                  }}
                  selected={draftRange}
                  showOutsideDays={false}
                  startMonth={dayjs(earliest).toDate()}
                />
              </div>
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
                  Apply custom dates
                </Button>
              </div>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </fieldset>
  )
}
