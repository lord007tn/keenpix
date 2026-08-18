import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { DataFilters, type FilterField } from '@/components/app/data-filters'
import { HistoryRangePicker } from '@/components/app/history-range-picker'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getBillingStateFn } from '@/functions/billing'
import { listLogsFn } from '@/functions/logs'
import { limitHistorySearch } from '@/helpers/history/window'
import {
  BASIC_LOG_LIMIT,
  DEFAULT_LOG_RETENTION_DAYS,
  getPlan,
} from '@/lib/billing/plans'
import { humanBytes } from '@/shared/format'
import { appPageHead } from '@/shared/seo'
import {
  type HistoricalAnalyticsRange,
  isHistoricalAnalyticsRange,
  type LogRow,
} from '@/shared/types'
import { useProject } from '@/stores/project-context'

const EMPTY_VALUES: string[] = []

export const Route = createFileRoute('/app/logs/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    from?: string
    project?: string
    range: HistoricalAnalyticsRange
    to?: string
  } => {
    const range = isHistoricalAnalyticsRange(search.range)
      ? search.range
      : '24h'
    let from: string | undefined
    let to: string | undefined
    if (range === 'custom') {
      const today = dayjs().format('YYYY-MM-DD')
      const start = typeof search.from === 'string' ? dayjs(search.from) : null
      const end = typeof search.to === 'string' ? dayjs(search.to) : null
      from =
        start?.isValid() && start.format('YYYY-MM-DD') === search.from
          ? search.from
          : dayjs().subtract(9, 'day').format('YYYY-MM-DD')
      to =
        end?.isValid() && end.format('YYYY-MM-DD') === search.to
          ? search.to
          : today
      if (dayjs(from).isAfter(to) || dayjs(to).isAfter(today)) {
        from = dayjs().subtract(9, 'day').format('YYYY-MM-DD')
        to = today
      }
    }
    return {
      from,
      project: typeof search.project === 'string' ? search.project : undefined,
      range,
      to,
    }
  },
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ context }) => {
    if (!context.workspaceReady) {
      throw redirect({ to: '/app/onboarding' })
    }
  },
  loader: ({ deps }) => listLogsFn({ data: deps }),
  head: () =>
    appPageHead(
      'Live logs',
      'Live Keenpix request logs with status, format, cache state, latency, and response size filters.',
    ),
  component: LogsPage,
})

const CACHE_OPTIONS = [
  { value: 'hit', label: 'Cache hit' },
  { value: 'miss', label: 'Cache miss' },
]

function uniq(values: string[]): string[] {
  return [...new Set(values)]
}

function latencyClass(latencyMs: number): string {
  if (latencyMs < 30) {
    return 'text-success-text'
  }
  if (latencyMs < 100) {
    return ''
  }
  return 'text-warning-text'
}

function exportNdjson(rows: LogRow[]) {
  const text = rows.map((r) => JSON.stringify(r)).join('\n')
  const blob = new Blob([text], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'keenpix-logs.ndjson'
  a.click()
  URL.revokeObjectURL(url)
}

function LogsPage() {
  const initialLogs = Route.useLoaderData()
  const { from, project, range, to } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { currentProject, isAll, projects } = useProject()
  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const { cloud } = useRouteContext({ from: '/app' })
  const { data: billing } = useQuery({
    enabled: cloud,
    queryFn: () => getBillingStateFn(),
    queryKey: ['billing-state'],
    staleTime: 30_000,
  })
  const maxHistoryDays = cloud
    ? (getPlan(billing?.plan)?.logRetentionDays ?? DEFAULT_LOG_RETENTION_DAYS)
    : 3650
  const boundedWindow = limitHistorySearch(
    { range, from, to },
    cloud ? maxHistoryDays : undefined,
  )
  const visibleRange = boundedWindow.range
  const visibleFrom =
    boundedWindow.range === 'custom' ? boundedWindow.from : from
  const visibleTo = boundedWindow.range === 'custom' ? boundedWindow.to : to
  // Basic tier is capped at the most-recent BASIC_LOG_LIMIT with no search
  // server-side, so surface that instead of presenting a full-history search.
  const limitedLogs = cloud && !(getPlan(billing?.plan)?.advancedLogs ?? false)
  const [logs, setLogs] = useState(initialLogs)
  const [live, setLive] = useState(true)
  const [streamConnected, setStreamConnected] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({})
  const formats = filterValues.format ?? EMPTY_VALUES
  const statuses = filterValues.status ?? EMPTY_VALUES
  const cacheStates = filterValues.cache ?? EMPTY_VALUES
  const domains = isAll ? EMPTY_VALUES : (filterValues.domain ?? EMPTY_VALUES)
  const search = filter.trim().toLowerCase()
  const debouncedSearch = debouncedFilter.trim()
  const hasServerFilters =
    debouncedSearch.length >= 2 ||
    formats.length > 0 ||
    statuses.length > 0 ||
    cacheStates.length > 0 ||
    domains.length > 0

  const queryParams = useMemo(
    () => ({
      cache: cacheStates,
      domain: domains,
      format: formats,
      from: boundedWindow.from,
      project,
      range: boundedWindow.range,
      search: debouncedSearch || undefined,
      status: statuses,
      to: boundedWindow.to,
    }),
    [
      boundedWindow.from,
      boundedWindow.range,
      boundedWindow.to,
      cacheStates,
      debouncedSearch,
      domains,
      formats,
      project,
      statuses,
    ],
  )
  const filteredLogsQuery = useQuery({
    enabled: hasServerFilters,
    placeholderData: keepPreviousData,
    queryFn: () => listLogsFn({ data: queryParams }),
    queryKey: ['logs', queryParams],
    refetchInterval: live && hasServerFilters ? 2500 : false,
    staleTime: 10_000,
  })

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedFilter(filter), 250)
    return () => window.clearTimeout(id)
  }, [filter])

  useEffect(() => {
    if (!live || hasServerFilters || visibleRange !== '24h') {
      return
    }
    const params = new URLSearchParams()
    if (project) {
      params.set('project', project)
    }
    setStreamConnected(true)
    const source = new EventSource(
      `/api/internal/logs/stream${params.size ? `?${params}` : ''}`,
    )
    source.onopen = () => setStreamConnected(true)
    source.onerror = () => {
      // The browser auto-reconnects transient drops (readyState CONNECTING); only
      // a permanent close (e.g. auth 401/403 → CLOSED) needs a visible status so
      // the feed never sits "Live" while silently dead.
      if (source.readyState === EventSource.CLOSED) {
        setStreamConnected(false)
      }
    }
    const onLogs = (event: Event) => {
      const rows = JSON.parse((event as MessageEvent).data) as LogRow[]
      if (rows.length === 0) {
        return
      }
      setLogs((current) => {
        const known = new Set(current.map((row) => row.id))
        const next = rows.filter((row) => !known.has(row.id)).reverse()
        return [...next, ...current].slice(0, 500)
      })
    }
    source.addEventListener('logs', onLogs)
    return () => {
      source.removeEventListener('logs', onLogs)
      source.close()
    }
  }, [hasServerFilters, live, project, visibleRange])

  useEffect(() => {
    if (!live) {
      return
    }
    setFilterValues((values) =>
      isAll && values.domain ? { ...values, domain: [] } : values,
    )
  }, [isAll, live])

  const formatOptions = useMemo(
    () => uniq(logs.map((l) => l.format)).map((v) => ({ value: v, label: v })),
    [logs],
  )
  const statusOptions = useMemo(
    () =>
      uniq(logs.map((l) => String(l.status)))
        .sort()
        .map((v) => ({ value: v, label: v })),
    [logs],
  )
  const domainOptions = useMemo(
    () =>
      uniq(logs.map((l) => l.sourceHost ?? ''))
        .filter(Boolean)
        .sort()
        .map((v) => ({ value: v, label: v })),
    [logs],
  )
  const visibleLogs = hasServerFilters ? (filteredLogsQuery.data ?? logs) : logs
  const filtered = visibleLogs.filter((l) => {
    if (
      search &&
      ![l.path, l.sourceHost ?? '', l.id, l.format, String(l.status)].some(
        (value) => value.toLowerCase().includes(search),
      )
    ) {
      return false
    }
    if (formats.length > 0 && !formats.includes(l.format)) {
      return false
    }
    if (statuses.length > 0 && !statuses.includes(String(l.status))) {
      return false
    }
    if (
      cacheStates.length > 0 &&
      !cacheStates.includes(l.cached ? 'hit' : 'miss')
    ) {
      return false
    }
    if (domains.length > 0 && !domains.includes(l.sourceHost ?? '')) {
      return false
    }
    return true
  })

  const hasActiveFilters =
    Boolean(search) ||
    formats.length > 0 ||
    statuses.length > 0 ||
    cacheStates.length > 0 ||
    domains.length > 0
  // Distinguish a brand-new project that has served nothing from a filter miss.
  const noTraffic =
    visibleRange === '24h' && !hasActiveFilters && visibleLogs.length === 0
  const emptyMessage = hasActiveFilters
    ? 'No requests match these filters.'
    : 'No requests in this date range.'

  const fields = useMemo<FilterField[]>(() => {
    const f: FilterField[] = [
      { key: 'format', label: 'Format', options: formatOptions },
      { key: 'status', label: 'Status', options: statusOptions },
      { key: 'cache', label: 'Cache', options: CACHE_OPTIONS },
    ]
    // Source-domain filter is per-project; options are the hosts actually seen
    // in this window (subdomains included), not the bare allowlist.
    if (!isAll && domainOptions.length > 0) {
      f.push({ key: 'domain', label: 'Domain', options: domainOptions })
    }
    return f
  }, [formatOptions, statusOptions, domainOptions, isAll])

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // chevron + timestamp + (project|domain) + path + width + format + status +
  // cache + latency + bytes — exactly one of project/domain renders.
  const columnCount = 10

  // hasServerFilters uses the polling query (no EventSource), so treat it healthy.
  const streamHealthy = streamConnected || hasServerFilters
  let liveLabel = 'Paused'
  let liveVariant: 'outline' | 'success' | 'warning' = 'outline'
  if (visibleRange !== '24h') {
    liveLabel = 'Historical'
  } else if (live) {
    liveLabel = streamHealthy ? 'Live' : 'Reconnecting…'
    liveVariant = streamHealthy ? 'success' : 'warning'
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        actions={
          <>
            <HistoryRangePicker
              billingPeriodStart={billing?.usage.periodStart}
              from={visibleFrom}
              label="Logs"
              maxDays={maxHistoryDays}
              onChange={(next) =>
                navigate({
                  search: (previous) => ({ ...previous, ...next }),
                })
              }
              range={visibleRange}
              to={visibleTo}
            />
            <Button
              disabled={visibleRange !== '24h'}
              onClick={() => setLive((v) => !v)}
              size="sm"
              variant={liveVariant}
            >
              <span
                className={`size-1.5 rounded-full bg-current ${live && streamHealthy ? 'animate-pulse' : ''}`}
              />
              {liveLabel}
            </Button>
            <Button
              disabled={filtered.length === 0}
              onClick={() => exportNdjson(filtered)}
              size="sm"
              variant="outline"
            >
              <DownloadIcon data-icon="inline-start" />
              NDJSON
            </Button>
          </>
        }
        eyebrow={isAll ? 'All projects' : currentProject?.name}
        subtitle={
          isAll
            ? 'Every request that hit keenpix — newest first, streamed from the server.'
            : `Every request for ${currentProject?.name ?? 'this project'} — newest first, streamed from the server.`
        }
        title="Live logs"
      />

      <div aria-live="polite" className="sr-only" role="status">
        {live && filtered[0]
          ? `Newest request: ${filtered[0].path}, status ${filtered[0].status}, ${filtered[0].format}, ${filtered[0].latency}ms, ${filtered[0].cached ? 'cache hit' : 'cache miss'}`
          : ''}
      </div>

      <Card className="flex flex-col gap-3 p-3">
        <div className="relative">
          <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="px-8 font-mono text-xs"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter by path… e.g. /products/"
            value={filter}
          />
          {filter ? (
            <button
              aria-label="Clear path search"
              className="absolute top-2.5 right-2.5 text-muted-foreground outline-none hover:text-foreground"
              onClick={() => setFilter('')}
              type="button"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>
        {limitedLogs ? (
          <p className="text-muted-foreground text-xs">
            Your plan shows up to {BASIC_LOG_LIMIT} requests in the selected{' '}
            {maxHistoryDays}-day retained window without full search.{' '}
            <Link
              className="text-primary hover:underline"
              search={{ section: 'billing' }}
              to="/app/settings"
            >
              Upgrade to Pro
            </Link>{' '}
            for 365-day retained history and search.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <DataFilters
            fields={fields}
            onChange={(key, next) =>
              setFilterValues((v) => ({ ...v, [key]: next }))
            }
            onClear={() => {
              setFilterValues({})
              setFilter('')
            }}
            values={filterValues}
          />
          <span className="ml-auto text-muted-foreground text-xs tabular-nums">
            {hasServerFilters
              ? `${filtered.length} matches`
              : `${filtered.length} of ${logs.length}`}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table containerClassName="max-h-[calc(100vh-22rem)] min-h-64 overflow-auto">
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              {isAll ? (
                <TableHead>Project</TableHead>
              ) : (
                <TableHead>Domain</TableHead>
              )}
              <TableHead className="w-full">Path</TableHead>
              <TableHead className="text-right">Width</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead>Cache</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead className="text-right">Bytes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-xs">
            {filtered.map((l) => {
              const isOpen = expanded.has(l.id)
              return (
                <Fragment key={l.id}>
                  <TableRow
                    aria-expanded={isOpen}
                    className="cursor-pointer aria-expanded:bg-muted/50"
                    onClick={() => toggleExpanded(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpanded(l.id)
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell className="text-muted-foreground">
                      {isOpen ? (
                        <ChevronDownIcon className="size-3.5" />
                      ) : (
                        <ChevronRightIcon className="size-3.5" />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dayjs(l.ts).format('MMM D, HH:mm:ss')}
                    </TableCell>
                    {isAll ? (
                      <TableCell className="text-foreground">
                        {projectName.get(l.projectId) ?? l.projectId}
                      </TableCell>
                    ) : (
                      <TableCell className="text-foreground">
                        {l.sourceHost ?? '—'}
                      </TableCell>
                    )}
                    <TableCell className="w-full max-w-0 truncate">
                      {l.path}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {l.w}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {l.format}
                    </TableCell>
                    <TableCell
                      className={`text-right ${l.status === 200 ? 'text-success-text' : 'text-destructive-text'}`}
                    >
                      {l.status}
                    </TableCell>
                    <TableCell
                      className={
                        l.cached ? 'text-success-text' : 'text-primary'
                      }
                    >
                      {l.cached ? 'HIT' : 'MISS'}
                    </TableCell>
                    <TableCell
                      className={`text-right ${latencyClass(l.latency)}`}
                    >
                      {l.latency}ms
                    </TableCell>
                    <TableCell className="text-right">
                      {humanBytes(l.bytesOut, 0)}
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        className="bg-muted/30 p-0"
                        colSpan={columnCount}
                      >
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
                          {[
                            { full: true, label: 'Path', value: l.path },
                            { label: 'Request ID', value: l.id },
                            {
                              label: 'Project',
                              value:
                                projectName.get(l.projectId) ?? l.projectId,
                            },
                            { label: 'Domain', value: l.sourceHost ?? '—' },
                            {
                              label: 'Timestamp',
                              value: dayjs(l.ts).format('MMM D, YYYY HH:mm:ss'),
                            },
                            { label: 'Status', value: String(l.status) },
                            { label: 'Format', value: l.format },
                            { label: 'Width', value: `${l.w}px` },
                            { label: 'Quality', value: String(l.q) },
                            {
                              label: 'Cache',
                              value: l.cached ? 'HIT' : 'MISS',
                            },
                            { label: 'Latency', value: `${l.latency}ms` },
                            { label: 'Bytes in', value: humanBytes(l.bytesIn) },
                            {
                              label: 'Bytes out',
                              value: humanBytes(l.bytesOut),
                            },
                            {
                              label: 'Saved',
                              value:
                                l.bytesSaved > 0
                                  ? humanBytes(l.bytesSaved)
                                  : '—',
                            },
                          ].map((d) => (
                            <div
                              className={d.full ? 'col-span-full' : ''}
                              key={d.label}
                            >
                              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                {d.label}
                              </dt>
                              <dd className="mt-0.5 break-all text-foreground">
                                {d.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
            {filteredLogsQuery.isError ? (
              <TableRow>
                <TableCell
                  className="py-14 text-center text-destructive"
                  colSpan={columnCount}
                >
                  Couldn’t search logs.
                </TableCell>
              </TableRow>
            ) : null}
            {!filteredLogsQuery.isError && filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-14 text-center text-muted-foreground"
                  colSpan={columnCount}
                >
                  {noTraffic ? (
                    <span className="flex flex-col items-center gap-1">
                      <span>No requests yet.</span>
                      <span className="text-xs">
                        Requests appear here once your site serves images
                        through keenpix.
                      </span>
                    </span>
                  ) : (
                    emptyMessage
                  )}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
