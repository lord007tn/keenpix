import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ServerIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarList } from '@/components/app/bar-list'
import { DataFilters, type FilterField } from '@/components/app/data-filters'
import { EdgeCacheKpis } from '@/components/app/edge-cache-kpis'
import { PageHeader } from '@/components/app/page-header'
import { StatCard } from '@/components/app/stat-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  AnalyticsAreaChart,
  type AreaView,
  EdgeCacheAreaChart,
  FormatDonut,
  LatencyHistogram,
} from '@/features/analytics/charts'
import { DomainBreakdown } from '@/features/analytics/domain-breakdown'
import { PercentileStat } from '@/features/analytics/percentile-stat'
import { ProjectBreakdown } from '@/features/analytics/project-breakdown'
import { getAnalyticsFn } from '@/functions/analytics'
import { compactNumber, humanBytes } from '@/shared/format'
import { appPageHead } from '@/shared/seo'
import { type AnalyticsRange, isAnalyticsRange } from '@/shared/types'
import { useProject } from '@/stores/project-context'

const RANGES: AnalyticsRange[] = ['24h', '7d', '30d', '90d']

function parseStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string')
  }
  if (typeof value === 'string') {
    return [value]
  }
  return
}

export const Route = createFileRoute('/app/analytics/')({
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
    range: AnalyticsRange
    project?: string
    status?: string[]
  } => ({
    range: isAnalyticsRange(search.range) ? search.range : '24h',
    project: typeof search.project === 'string' ? search.project : undefined,
    domain: parseStringArray(search.domain),
    format: parseStringArray(search.format),
    status: parseStringArray(search.status),
  }),
  loaderDeps: ({ search }) => ({
    range: search.range,
    project: search.project,
    domain: search.domain,
    format: search.format,
    status: search.status,
  }),
  loader: ({ deps }) =>
    getAnalyticsFn({
      data: {
        range: deps.range,
        project: deps.project,
        domain: deps.domain,
        format: deps.format,
        status: deps.status,
      },
    }),
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

function AnalyticsPage() {
  const data = Route.useLoaderData()
  const { range, format, status, domain } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { currentProject, isAll, setProject } = useProject()
  const [view, setView] = useState<AreaView>('requests')
  const fields = useMemo(() => {
    const base = buildFields(data.available, format ?? [], status ?? [])
    if (isAll) {
      return base
    }
    // The domain filter is per-project: options are the source hosts actually
    // observed (subdomains included) plus any already-selected value.
    const domains = [
      ...new Set([...data.available.domains, ...(domain ?? [])]),
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
  }, [data.available, format, status, domain, isAll])

  const [savedVal, savedUnit] = humanBytes(
    data.summary.bandwidthSaved,
    1,
  ).split(' ')
  const cachedCount = Math.round(
    (data.summary.totalRequests * data.summary.hitRate) / 100,
  )

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        actions={
          <>
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
            <ToggleGroup
              onValueChange={(v: string[]) => {
                const next = v[0]
                if (isAnalyticsRange(next)) {
                  navigate({ search: (p) => ({ ...p, range: next }) })
                }
              }}
              size="sm"
              value={[range]}
              variant="outline"
            >
              {RANGES.map((r) => (
                <ToggleGroupItem key={r} value={r}>
                  {r}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        }
        eyebrow={isAll ? 'All projects' : currentProject?.name}
        subtitle="Everything keenpix has seen this window. Built in, not bolted on."
        title="Analytics"
      />

      {data.edgeConfigured && data.edge ? (
        <EdgeCacheKpis edge={data.edge} />
      ) : null}
      {data.edgeConfigured && !data.edge ? (
        <p className="text-muted-foreground text-sm">
          Couldn't load Cloudflare edge data — check the token in Settings → CDN
          cache.
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        {data.edgeConfigured ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <ServerIcon className="size-4" />
            <h2 className="font-medium text-foreground text-sm">
              keenpix origin
            </h2>
            <span className="text-xs">last {range}</span>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            delta={`${data.summary.savingsPct.toFixed(1)}%`}
            label="Bandwidth saved"
            sub="vs origin"
            tooltip={
              <div className="flex flex-col gap-0.5">
                <span>
                  From origin: {humanBytes(data.summary.bandwidthIn, 1)}
                </span>
                <span>
                  To clients: {humanBytes(data.summary.bandwidthOut, 1)}
                </span>
                <span>Saved: {humanBytes(data.summary.bandwidthSaved, 1)}</span>
              </div>
            }
            unit={savedUnit}
            value={savedVal}
          />
          <StatCard
            label="Total images"
            sub={`last ${range}`}
            unit="requests"
            value={compactNumber(data.summary.totalRequests, 1)}
          />
          <StatCard
            label="Cache hit rate"
            sub={`last ${range}`}
            unit="%"
            value={data.summary.hitRate.toFixed(1)}
          />
          <StatCard
            label="p95 latency"
            sub={`last ${range}`}
            unit="ms"
            value={String(data.summary.p95)}
          />
        </div>
      </section>

      {isAll ? (
        <ProjectBreakdown onPick={setProject} rows={data.breakdown} />
      ) : null}
      {!isAll && data.domainBreakdown ? (
        <DomainBreakdown rows={data.domainBreakdown} />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{VIEW_TITLES[view]}</CardTitle>
          <ToggleGroup
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (isAreaView(next)) {
                setView(next)
              }
            }}
            size="sm"
            value={[view]}
            variant="outline"
          >
            {AREA_VIEWS.map((o) => (
              <ToggleGroupItem key={o.value} value={o.value}>
                {o.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardHeader>
        <CardContent>
          <AnalyticsAreaChart data={data.series} view={view} />
        </CardContent>
      </Card>

      {data.edgeConfigured && data.edge ? (
        <Card>
          <CardHeader>
            <CardTitle>Cloudflare edge cache</CardTitle>
            <CardDescription>
              Requests served at the edge vs. those that reached keenpix · last{' '}
              {data.edge.windowHours}h
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EdgeCacheAreaChart data={data.edge.series} />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Format distribution</CardTitle>
            <CardDescription>
              {compactNumber(data.summary.totalRequests)} requests · last{' '}
              {range}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormatDonut data={data.formats} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cache performance</CardTitle>
            <CardDescription>Disk-cache hits vs misses</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hit rate</span>
              <span className="font-medium tabular-nums">
                {data.summary.hitRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={data.summary.hitRate} />
            <div className="flex justify-between text-muted-foreground text-xs">
              <span>{compactNumber(cachedCount)} hits</span>
              <span>
                {compactNumber(data.summary.totalRequests - cachedCount)} misses
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Response latency</CardTitle>
            <CardDescription>Per-request distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-6">
              <PercentileStat
                label="p50"
                tone="text-muted-foreground"
                value={String(data.summary.p50)}
              />
              <PercentileStat
                label="p95"
                tone="text-warning-text"
                value={String(data.summary.p95)}
              />
              <PercentileStat
                label="p99"
                tone="text-destructive-text"
                value={String(data.summary.p99)}
              />
            </div>
            <LatencyHistogram data={data.latency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top images</CardTitle>
          <CardDescription>Most-requested paths, last {range}</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList
            barColor="var(--chart-1)"
            data={data.topImages}
            valueFormat={(v) => `${compactNumber(v)} req`}
          />
        </CardContent>
      </Card>
    </div>
  )
}
