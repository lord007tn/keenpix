import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CloudIcon,
  DownloadIcon,
  GitCompareIcon,
  LayersIcon,
  type LucideIcon,
} from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { BarList } from '@/components/app/bar-list'
import { DataFilters, type FilterField } from '@/components/app/data-filters'
import {
  HISTORY_RANGES,
  HistoryRangePicker,
} from '@/components/app/history-range-picker'
import { PageHeader } from '@/components/app/page-header'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AnalyticsAreaChart,
  type AreaView,
  BandwidthSavedChart,
  EdgeCacheAreaChart,
  FormatDonut,
  LatencyTrendChart,
  SourceCompareChart,
  StatusAreaChart,
} from '@/features/analytics/charts'
import { DomainBreakdown } from '@/features/analytics/domain-breakdown'
import { ProjectBreakdown } from '@/features/analytics/project-breakdown'
import { ResponseLatencyCard } from '@/features/analytics/response-latency-card'
import { AnalyticsBodySkeleton } from '@/features/analytics/skeletons'
import { SourceSplitCards } from '@/features/analytics/source-split-cards'
import { useAnalyticsQuery } from '@/features/analytics/use-analytics-query'
import { useEdgeStats } from '@/features/analytics/use-edge-stats'
import { getBillingStateFn } from '@/functions/billing'
import { analyticsSeriesCsv } from '@/helpers/analytics/export-csv'
import { limitHistorySearch } from '@/helpers/history/window'
import { DEFAULT_HISTORY_DAYS, getPlan } from '@/lib/billing/plans'
import { compactNumber, humanBytes } from '@/shared/format'
import { appPageHead } from '@/shared/seo'
import {
  type HistoricalAnalyticsRange,
  isHistoricalAnalyticsRange,
} from '@/shared/types'
import { useProject } from '@/stores/project-context'

const EMPTY_AVAILABLE = { formats: [], statuses: [], domains: [] }

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof value === 'string') {
    return [value]
  }
  return
}

function getDateParam(value: unknown) {
  if (typeof value !== 'string') {
    return
  }
  const date = dayjs(value)
  return date.isValid() && date.format('YYYY-MM-DD') === value
    ? value
    : undefined
}

export const Route = createFileRoute('/app/analytics/')({
  beforeLoad: ({ context }) => {
    if (!context.workspaceReady) {
      throw redirect({ to: '/app/onboarding' })
    }
  },
  head: () =>
    appPageHead(
      'Analytics',
      'Keenpix analytics for bandwidth savings, cache hit rate, formats, latency, and top image paths.',
    ),
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    domain?: string[]
    format?: string[]
    from?: string
    range: HistoricalAnalyticsRange
    project?: string
    status?: string[]
    to?: string
  } => {
    const range = isHistoricalAnalyticsRange(search.range) ? search.range : '7d'
    let from: string | undefined
    let to: string | undefined
    if (range === 'custom') {
      const today = dayjs().format('YYYY-MM-DD')
      from =
        getDateParam(search.from) ??
        dayjs().subtract(29, 'day').format('YYYY-MM-DD')
      to = getDateParam(search.to) ?? today
      if (dayjs(from).isAfter(to) || dayjs(to).isAfter(today)) {
        from = dayjs().subtract(29, 'day').format('YYYY-MM-DD')
        to = today
      }
    }
    return {
      range,
      project: typeof search.project === 'string' ? search.project : undefined,
      domain: parseStringArray(search.domain),
      format: parseStringArray(search.format),
      from,
      status: parseStringArray(search.status),
      to,
    }
  },
  component: AnalyticsPage,
})

const FORMAT_LABELS: Record<string, string> = {
  avif: 'AVIF',
  webp: 'WebP',
  jpeg: 'JPEG',
  jpg: 'JPEG',
  png: 'PNG',
  gif: 'GIF',
  heif: 'HEIF',
  svg: 'SVG',
  tiff: 'TIFF',
}

const STATUS_LABELS: Record<string, string> = {
  '200': '200 OK',
  '304': '304 Not Modified',
  '400': '400 Bad Request',
  '403': '403 Forbidden',
  '404': '404 Not Found',
  '413': '413 Too Large',
  '500': '500 Server Error',
  '502': '502 Bad Gateway',
  '503': '503 Busy',
  '504': '504 Timeout',
}

// Build the filter fields from the values actually present in the window (plus
// any currently-selected value, so a stale selection stays removable). A field
// with no values is omitted rather than opening an empty, broken-looking menu.
function buildFields(
  available: { formats: string[]; statuses: number[] },
  selectedFormat: string[],
  selectedStatus: string[],
): FilterField[] {
  const fields: FilterField[] = []
  const formatValues = [
    ...new Set([...available.formats, ...selectedFormat]),
  ].sort()
  if (formatValues.length > 0) {
    fields.push({
      key: 'format',
      label: 'Format',
      options: formatValues.map((v) => ({
        value: v,
        label: FORMAT_LABELS[v] ?? v.toUpperCase(),
      })),
    })
  }
  const statusValues = [
    ...new Set([...available.statuses.map(String), ...selectedStatus]),
  ].sort((a, b) => Number(a) - Number(b))
  if (statusValues.length > 0) {
    fields.push({
      key: 'status',
      label: 'Status',
      options: statusValues.map((v) => ({
        value: v,
        label: STATUS_LABELS[v] ?? v,
      })),
    })
  }
  return fields
}

const AREA_VIEWS: { value: AreaView; label: string }[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'bandwidth', label: 'Bandwidth' },
  { value: 'cache', label: 'Cache' },
]

const VIEW_TITLES: Record<AreaView, string> = {
  requests: 'Requests over time',
  bandwidth: 'Bandwidth over time',
  cache: 'Cache hit rate over time',
}

function isAreaView(value: unknown): value is AreaView {
  return value === 'requests' || value === 'bandwidth' || value === 'cache'
}

// The single "Traffic over time" chart shows the same edge+origin data through
// three lenses: the stacked funnel, the edge-vs-keenpix overlay, or edge only.
type ChartLens = 'funnel' | 'compare' | 'edge'

const LENSES: { value: ChartLens; label: string; icon: LucideIcon }[] = [
  { value: 'funnel', label: 'Funnel', icon: LayersIcon },
  { value: 'compare', label: 'Compare', icon: GitCompareIcon },
  { value: 'edge', label: 'Edge', icon: CloudIcon },
]

function isChartLens(value: unknown): value is ChartLens {
  return value === 'funnel' || value === 'compare' || value === 'edge'
}

function AnalyticsPage() {
  const search = Route.useSearch()
  const { range, format, status, domain, from, to } = search
  const navigate = useNavigate({ from: Route.fullPath })
  const { cloud, user } = useRouteContext({ from: '/app' })
  const isSuperAdmin = user.role === 'super_admin'
  // Cloud edge data is platform-wide and belongs in /admin, never beside one
  // organization's origin totals. Self-host remains a single-instance view.
  const canSeeEdge = !cloud
  const { currentProject, isAll, setProject } = useProject()
  const { data: billing } = useQuery({
    enabled: cloud,
    queryFn: () => getBillingStateFn(),
    queryKey: ['billing-state'],
    staleTime: 30_000,
  })
  const maxHistoryDays = cloud
    ? (getPlan(billing?.plan)?.historyDays ?? DEFAULT_HISTORY_DAYS)
    : 3650
  const boundedWindow = limitHistorySearch(
    { range, from, to },
    cloud ? maxHistoryDays : undefined,
  )
  const visibleRange = boundedWindow.range
  const visibleFrom =
    boundedWindow.range === 'custom' ? boundedWindow.from : from
  const visibleTo = boundedWindow.range === 'custom' ? boundedWindow.to : to
  const advancedAnalytics =
    !cloud || (getPlan(billing?.plan)?.advancedAnalytics ?? false)
  // Stale-while-revalidate: the previous window stays on screen while a new
  // range/filter loads; `isRefreshing` drives the inline indicator.
  const { data, isPending, isFetching, isError, refetch } = useAnalyticsQuery({
    ...search,
    ...boundedWindow,
  })
  const isRefreshing = isFetching && !isPending
  // Cloudflare edge stats load off the critical path; the edge cards/lenses
  // fill in afterward. Range-aware now that we persist edge history.
  const {
    edge,
    edgeConfigured,
    edgeCovered,
    edgeRefreshing,
    edgePending,
    edgeError,
  } = useEdgeStats(canSeeEdge ? boundedWindow : undefined)
  const [view, setView] = useState<AreaView>('requests')
  const [lens, setLens] = useState<ChartLens>('funnel')
  const [topMetric, setTopMetric] = useState<'requests' | 'bytes'>('requests')
  const selectedRangeLabel =
    HISTORY_RANGES.find((item) => item.value === visibleRange)?.label ??
    visibleRange
  const windowDescription =
    visibleRange === 'custom' && visibleFrom && visibleTo
      ? `${visibleFrom} to ${visibleTo}`
      : selectedRangeLabel.toLowerCase()
  // Top images carry both dimensions; rank and format by the selected metric.
  const topImages = useMemo(
    () =>
      [...(data?.topImages ?? [])]
        .sort((a, b) =>
          topMetric === 'bytes' ? b.bytes - a.bytes : b.requests - a.requests,
        )
        .slice(0, 8)
        .map((r) => ({
          label: r.label,
          value: topMetric === 'bytes' ? r.bytes : r.requests,
        })),
    [data?.topImages, topMetric],
  )
  const fields = useMemo(() => {
    const base = buildFields(
      data?.available ?? EMPTY_AVAILABLE,
      format ?? [],
      status ?? [],
    )
    if (isAll) {
      return base
    }
    // The domain filter is per-project: options are the source hosts actually
    // observed (subdomains included) plus any already-selected value.
    const domains = [
      ...new Set([...(data?.available?.domains ?? []), ...(domain ?? [])]),
    ].sort()
    if (domains.length === 0) {
      return base
    }
    return [
      ...base,
      {
        key: 'domain',
        label: 'Domain',
        options: domains.map((d) => ({ value: d, label: d })),
      },
    ]
  }, [data?.available, format, status, domain, isAll])

  const downloadAnalytics = () => {
    if (!data) {
      return
    }
    const url = URL.createObjectURL(
      new Blob([analyticsSeriesCsv(data.series, edge?.series)], {
        type: 'text/csv',
      }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `keenpix-analytics-${data.window.from.slice(0, 10)}-${data.window.to.slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const header = (
    <PageHeader
      actions={
        <>
          {data ? (
            <DataFilters
              fields={fields}
              onChange={(key, next) =>
                navigate({
                  search: (p) => ({
                    ...p,
                    [key]: next.length > 0 ? next : undefined,
                  }),
                })
              }
              onClear={() =>
                navigate({
                  search: (p) => ({
                    ...p,
                    domain: undefined,
                    format: undefined,
                    status: undefined,
                  }),
                })
              }
              values={{
                domain: domain ?? [],
                format: format ?? [],
                status: status ?? [],
              }}
            />
          ) : null}
          <RefreshingIndicator
            active={isRefreshing}
            error={isError && Boolean(data)}
          />
          <HistoryRangePicker
            from={visibleFrom}
            label="Analytics"
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
            aria-label="Export analytics CSV"
            className="h-11"
            disabled={!data}
            onClick={downloadAnalytics}
            size="sm"
            variant="outline"
          >
            <DownloadIcon aria-hidden="true" />
            Export CSV
          </Button>
        </>
      }
      eyebrow={isAll ? 'All projects' : currentProject?.name}
      subtitle="Organization- and project-scoped delivery history measured at the keenpix origin."
      title="Analytics"
    />
  )

  // First load (no cached data yet): keep the header interactive over a light
  // loading state — no skeletons.
  if (!data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {header}
        {isError ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-destructive text-sm">Couldn’t load analytics.</p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <AnalyticsBodySkeleton />
        )}
      </div>
    )
  }

  const hasDomainFilter = Boolean(domain && domain.length > 0)
  // Edge is zone-wide /img/*, so it only reconciles with origin at all-projects
  // scope with no domain filter — and only over a window our captured history
  // fully covers (edgeCovered).
  const edgeScopeOk = isAll && !hasDomainFilter
  const edgeGated =
    edgeConfigured && edge !== null && edgeScopeOk && edgeCovered
  // Not wired up at all gets a real connect CTA; the other reasons are just a
  // muted hint. Both wait for the edge query to resolve so neither flashes while
  // it is still pending — and a failed fetch is "couldn't load" (handled by the
  // !edge note below), never a false "not configured".
  // Only the operator can wire Cloudflare, so only the super-admin ever sees the
  // connect CTA. Regular tenants get origin-only cards with no dead-end prompt.
  const edgeNotConfigured =
    canSeeEdge && isSuperAdmin && !(edgePending || edgeError || edgeConfigured)
  // A background capture is in flight and the reconciled split isn't on screen
  // yet — show the "preparing" indicator (and hold the note) until it lands.
  const edgePreparing = edgeRefreshing && !edgeGated
  let edgeNote: string | undefined
  if (
    canSeeEdge &&
    !(edgePending || edgePreparing || edgeGated || edgeNotConfigured)
  ) {
    if (edgeError || !edge) {
      // A missing/broken token is only actionable by the operator, so only they
      // get the "check the token" hint; other viewers get no edge note at all.
      edgeNote = isSuperAdmin
        ? "Couldn't load edge data — check the CLOUDFLARE_* env vars (Admin → Settings)."
        : undefined
    } else if (edgeScopeOk) {
      edgeNote =
        'Edge history is still accumulating — older data for this range isn’t available yet.'
    } else {
      edgeNote =
        'Edge is whole-zone only — switch to All projects with no filters to see the source split.'
    }
  }

  // Compare needs both layers at the same 24h whole-zone window; Edge only needs
  // edge to exist. Funnel always works (origin-only when edge is unavailable).
  const lensAvailable: Record<ChartLens, boolean> = {
    funnel: true,
    compare: canSeeEdge && edgeGated,
    edge: canSeeEdge && edgeConfigured && edge !== null,
  }
  const activeLens: ChartLens = lensAvailable[lens] ? lens : 'funnel'
  let lensDescription: string
  if (activeLens === 'compare') {
    lensDescription = `Edge vs keenpix, overlaid · ${windowDescription}`
  } else if (activeLens === 'edge') {
    lensDescription = `Edge, zone-wide · ${windowDescription}`
  } else if (edgeGated) {
    lensDescription = `Edge → keenpix cache → live · ${windowDescription}`
  } else {
    lensDescription = `keenpix origin · ${windowDescription}`
  }
  let chartEl: ReactNode
  if (activeLens === 'compare' && edge) {
    chartEl = (
      <SourceCompareChart data={data.series} edge={edge.series} view={view} />
    )
  } else if (activeLens === 'edge' && edge) {
    chartEl = <EdgeCacheAreaChart data={edge.series} view={view} />
  } else {
    chartEl = (
      <AnalyticsAreaChart
        data={data.series}
        edge={edge?.series}
        funnel={edgeGated}
        view={view}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {header}

      {advancedAnalytics ? null : (
        <p className="text-muted-foreground text-sm">
          You’re on core analytics.{' '}
          <Link
            className="text-primary hover:underline"
            search={{ section: 'billing' }}
            to="/app/settings"
          >
            Upgrade to Pro
          </Link>{' '}
          for advanced log search and 365-day retained history. Durable
          aggregate history remains available here.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <SourceSplitCards
          connect={edgeNotConfigured}
          edge={edge}
          gated={edgeGated}
          note={edgeNote}
          preparing={edgePreparing}
          summary={data.summary}
        />
        <p className="text-muted-foreground text-xs">
          Customer totals are measured from requests that reached keenpix. A
          Cloudflare edge hit never reaches the origin, so zone-wide edge
          delivery is reported separately and is visible only to the platform
          operator.
        </p>
      </section>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>{VIEW_TITLES[view]}</CardTitle>
            <CardDescription>{lensDescription}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {canSeeEdge ? (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs uppercase tracking-wide">
                  View
                </span>
                <Select
                  onValueChange={(v) => {
                    if (isChartLens(v)) {
                      setLens(v)
                    }
                  }}
                  value={activeLens}
                >
                  <SelectTrigger className="w-[8.5rem]" size="sm">
                    <SelectValue>
                      {(v) =>
                        LENSES.find((l) => l.value === v)?.label ?? String(v)
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {LENSES.map((l) => (
                      <SelectItem
                        disabled={!lensAvailable[l.value]}
                        key={l.value}
                        value={l.value}
                      >
                        <l.icon className="size-3.5" />
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Metric
              </span>
              <Select
                onValueChange={(v) => {
                  if (isAreaView(v)) {
                    setView(v)
                  }
                }}
                value={view}
              >
                <SelectTrigger className="w-[8.5rem]" size="sm">
                  <SelectValue>
                    {(v) =>
                      AREA_VIEWS.find((o) => o.value === v)?.label ?? String(v)
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {AREA_VIEWS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>{chartEl}</CardContent>
      </Card>

      {isAll ? (
        <ProjectBreakdown onPick={setProject} rows={data.breakdown} />
      ) : null}
      {!isAll && data.domainBreakdown ? (
        <DomainBreakdown rows={data.domainBreakdown} />
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground text-sm">
          Optimization quality
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Format distribution</CardTitle>
              <CardDescription>
                {compactNumber(data.summary.totalRequests)} requests ·{' '}
                {windowDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormatDonut data={data.formats} />
            </CardContent>
          </Card>

          <ResponseLatencyCard bins={data.latency} summary={data.summary} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Latency over time</CardTitle>
            <CardDescription>
              p50 / p95 / p99 per bucket · {windowDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LatencyTrendChart data={data.latencyTrend} />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                <CardTitle>Top images</CardTitle>
                <CardDescription>
                  {topMetric === 'bytes'
                    ? 'By delivered bytes'
                    : 'By request count'}{' '}
                  · {windowDescription}
                </CardDescription>
              </div>
              <ToggleGroup
                onValueChange={(v: string[]) => {
                  if (v[0] === 'requests' || v[0] === 'bytes') {
                    setTopMetric(v[0])
                  }
                }}
                size="sm"
                value={[topMetric]}
                variant="outline"
              >
                <ToggleGroupItem value="requests">Requests</ToggleGroupItem>
                <ToggleGroupItem value="bytes">Bytes</ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>
            <CardContent>
              <BarList
                barColor="var(--chart-1)"
                data={topImages}
                valueFormat={(v) =>
                  topMetric === 'bytes'
                    ? humanBytes(v, 1)
                    : `${compactNumber(v)} req`
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic by country</CardTitle>
              <CardDescription>
                Requests by requester country · {windowDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.geo.length > 0 ? (
                <BarList
                  barColor="var(--chart-3)"
                  data={data.geo.map((g) => ({
                    label: g.country,
                    value: g.requests,
                  }))}
                  valueFormat={(v) => `${compactNumber(v)} req`}
                />
              ) : (
                <p className="py-6 text-center text-muted-foreground text-sm">
                  No requests in this window yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-foreground text-sm">
          Savings &amp; reliability
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bandwidth saved over time</CardTitle>
              <CardDescription>
                Per bucket and cumulative · {windowDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BandwidthSavedChart data={data.series} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requests by status</CardTitle>
              <CardDescription>
                2xx / 3xx / 4xx / 5xx · {windowDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusAreaChart data={data.statusSeries} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
