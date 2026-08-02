import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { mergeFunnel, mergeSourceCompare } from '@/helpers/analytics/funnel'
import { compactNumber, humanBytes } from '@/shared/format'
import type {
  EdgeCachePoint,
  FormatSlice,
  LatencyBin,
  LatencyTrendPoint,
  StatusPoint,
  TimePoint,
} from '@/shared/types'

export type AreaView = 'requests' | 'bandwidth' | 'cache'

interface AreaBuild {
  // Recharts data rows; the concrete shape (TimePoint / FunnelPoint / edge
  // point) varies per builder, so this stays a loose object array.
  chartData: object[]
  config: ChartConfig
  keys: string[]
  // Fixed y-axis range for rate views (0–100%) so headroom reads as "missed".
  yDomain?: [number, number]
  yFormat: (v: number) => string
}

function buildArea(data: TimePoint[], view: AreaView): AreaBuild {
  if (view === 'bandwidth') {
    return {
      config: {
        bandwidthIn: { label: 'From origin', color: 'var(--muted-foreground)' },
        bandwidthOut: { label: 'To clients', color: 'var(--chart-1)' },
      } satisfies ChartConfig,
      keys: ['bandwidthIn', 'bandwidthOut'],
      chartData: data,
      yFormat: (v: number) => humanBytes(v, 0),
    }
  }
  if (view === 'cache') {
    return {
      config: {
        hit: { label: 'Hit rate', color: 'var(--chart-2)' },
      } satisfies ChartConfig,
      keys: ['hit'],
      chartData: data.map((d) => ({
        ...d,
        hit: d.successful === 0 ? 0 : (d.cached / d.successful) * 100,
      })),
      yFormat: (v: number) => `${Math.round(v)}%`,
      yDomain: [0, 100],
    }
  }
  return {
    config: {
      cached: { label: 'Cache hit', color: 'var(--chart-2)' },
      optimized: { label: 'Optimized', color: 'var(--chart-1)' },
    } satisfies ChartConfig,
    keys: ['cached', 'optimized'],
    chartData: data,
    yFormat: (v: number) => compactNumber(v, 0),
  }
}

function buildFunnelArea(
  origin: TimePoint[],
  edge: EdgeCachePoint[],
  view: AreaView,
): AreaBuild {
  const chartData = mergeFunnel(origin, edge)
  if (view === 'bandwidth') {
    return {
      config: {
        edgeBytes: { label: 'Edge', color: 'var(--chart-1)' },
        originBytes: { label: 'keenpix origin', color: 'var(--chart-2)' },
      } satisfies ChartConfig,
      keys: ['edgeBytes', 'originBytes'],
      chartData,
      yFormat: (v: number) => humanBytes(v, 0),
    }
  }
  if (view === 'cache') {
    // Stack the two cache sources so the chart mirrors the hit-rate card:
    // Cloudflare edge + Keenpix cache, summing to the end-to-end hit rate.
    return {
      config: {
        edgeShare: { label: 'Edge', color: 'var(--chart-1)' },
        diskShare: { label: 'Keenpix cache', color: 'var(--chart-2)' },
      } satisfies ChartConfig,
      keys: ['edgeShare', 'diskShare'],
      chartData,
      yFormat: (v: number) => `${Math.round(v)}%`,
      yDomain: [0, 100],
    }
  }
  return {
    config: {
      edgeServed: { label: 'Edge', color: 'var(--chart-1)' },
      diskServed: { label: 'Keenpix cache', color: 'var(--chart-2)' },
      liveProcessed: {
        label: 'Optimized',
        color: 'var(--muted-foreground)',
      },
    } satisfies ChartConfig,
    keys: ['edgeServed', 'diskServed', 'liveProcessed'],
    chartData,
    yFormat: (v: number) => compactNumber(v, 0),
  }
}

export function AnalyticsAreaChart({
  data,
  edge,
  funnel,
  view,
}: {
  data: TimePoint[]
  edge?: EdgeCachePoint[]
  funnel?: boolean
  view: AreaView
}) {
  const { config, keys, chartData, yFormat, yDomain } =
    funnel && edge ? buildFunnelArea(data, edge, view) : buildArea(data, view)
  return (
    <ChartContainer className="aspect-auto h-64 w-full" config={config}>
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          domain={yDomain}
          tickFormatter={yFormat}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Area
            dataKey={k}
            fill={`var(--color-${k})`}
            fillOpacity={0.18}
            key={k}
            stackId="a"
            stroke={`var(--color-${k})`}
            type="monotone"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

function buildCompareArea(view: AreaView): {
  config: ChartConfig
  keys: string[]
  yDomain?: [number, number]
  yFormat: (v: number) => string
} {
  if (view === 'bandwidth') {
    return {
      config: {
        cfBytes: { label: 'Edge', color: 'var(--chart-1)' },
        kpBytes: { label: 'keenpix', color: 'var(--chart-2)' },
      },
      keys: ['cfBytes', 'kpBytes'],
      yFormat: (v: number) => humanBytes(v, 0),
    }
  }
  if (view === 'cache') {
    return {
      config: {
        cfHitRate: { label: 'Edge', color: 'var(--chart-1)' },
        kpHitRate: { label: 'Keenpix cache', color: 'var(--chart-2)' },
      },
      keys: ['cfHitRate', 'kpHitRate'],
      yFormat: (v: number) => `${Math.round(v)}%`,
      yDomain: [0, 100],
    }
  }
  return {
    config: {
      cfRequests: { label: 'Edge', color: 'var(--chart-1)' },
      kpRequests: { label: 'keenpix', color: 'var(--chart-2)' },
    },
    keys: ['cfRequests', 'kpRequests'],
    yFormat: (v: number) => compactNumber(v, 0),
  }
}

// Cloudflare and keenpix overlaid (not stacked) so the two sources can be
// compared directly — most usefully the edge hit rate vs the Keenpix cache hit
// rate on the same axis. Lives next to the stacked funnel chart; both need the
// 24h whole-zone window where edge data exists.
export function SourceCompareChart({
  data,
  edge,
  view,
}: {
  data: TimePoint[]
  edge: EdgeCachePoint[]
  view: AreaView
}) {
  const merged: object[] = mergeSourceCompare(data, edge)
  const { config, keys, yFormat, yDomain } = buildCompareArea(view)
  return (
    <ChartContainer className="aspect-auto h-64 w-full" config={config}>
      <AreaChart accessibilityLayer data={merged}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          domain={yDomain}
          tickFormatter={yFormat}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Area
            dataKey={k}
            fill={`var(--color-${k})`}
            fillOpacity={0.12}
            key={k}
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            type="monotone"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

export function FormatDonut({ data }: { data: FormatSlice[] }) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d) => [d.label, { label: d.label, color: d.color }]),
  )
  // A fresh install (empty request_logs) yields no slices — guard the centre
  // label so the whole analytics page doesn't throw on data[0].
  if (data.length === 0) {
    return (
      <div className="mx-auto flex aspect-square h-44 items-center justify-center text-center text-muted-foreground text-sm">
        No requests in this window yet.
      </div>
    )
  }
  const top = data[0]
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <div className="relative shrink-0">
        <ChartContainer className="aspect-square h-44" config={config}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={data}
              dataKey="value"
              innerRadius={52}
              nameKey="label"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell fill={d.color} key={d.label} stroke="var(--card)" />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="font-semibold text-xl tabular-nums">
            {top.value}%
          </span>
          <span className="text-muted-foreground text-xs">{top.label}</span>
        </div>
      </div>
      <ul className="flex w-full flex-col gap-2 sm:flex-1">
        {data.map((d) => (
          <li className="flex items-center gap-2 text-xs" key={d.label}>
            <span
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: d.color }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.label}
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-medium">{d.value}%</span>
              {d.saved > 0 ? (
                <span className="ml-2 text-muted-foreground">
                  {humanBytes(d.saved, 0)} saved
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildEdgeArea(data: EdgeCachePoint[], view: AreaView): AreaBuild {
  if (view === 'bandwidth') {
    return {
      config: {
        bytes: { label: 'Served from edge', color: 'var(--chart-1)' },
      } satisfies ChartConfig,
      keys: ['bytes'],
      chartData: data,
      yFormat: (v: number) => humanBytes(v, 0),
    }
  }
  if (view === 'cache') {
    return {
      config: {
        rate: { label: 'Edge hit rate', color: 'var(--chart-2)' },
      } satisfies ChartConfig,
      keys: ['rate'],
      chartData: data.map((d) => ({
        ...d,
        rate: d.hit + d.miss === 0 ? 0 : (d.hit / (d.hit + d.miss)) * 100,
      })),
      yFormat: (v: number) => `${Math.round(v)}%`,
      yDomain: [0, 100],
    }
  }
  return {
    config: {
      hit: { label: 'Edge hit', color: 'var(--chart-2)' },
      miss: { label: 'Reached origin', color: 'var(--chart-1)' },
    } satisfies ChartConfig,
    keys: ['hit', 'miss'],
    chartData: data,
    yFormat: (v: number) => compactNumber(v, 0),
  }
}

// Hourly Cloudflare edge traffic over the fixed 24h window, with the same
// requests / bandwidth / cache views as the origin chart — but zone-wide and
// edge-only (hit vs reached-origin, edge bytes, edge hit rate).
export function EdgeCacheAreaChart({
  data,
  view,
}: {
  data: EdgeCachePoint[]
  view: AreaView
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-center text-muted-foreground text-sm">
        No edge traffic in the last 24h.
      </div>
    )
  }
  const { config, keys, chartData, yFormat, yDomain } = buildEdgeArea(
    data,
    view,
  )
  return (
    <ChartContainer className="aspect-auto h-64 w-full" config={config}>
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          domain={yDomain}
          tickFormatter={yFormat}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Area
            dataKey={k}
            fill={`var(--color-${k})`}
            fillOpacity={0.18}
            key={k}
            stackId="a"
            stroke={`var(--color-${k})`}
            type="monotone"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

export function LatencyHistogram({ data }: { data: LatencyBin[] }) {
  const config = {
    value: { label: 'Requests', color: 'var(--chart-2)' },
  } satisfies ChartConfig
  return (
    <ChartContainer className="aspect-auto h-32 w-full" config={config}>
      <BarChart accessibilityLayer data={data}>
        <XAxis
          axisLine={false}
          dataKey="label"
          interval={0}
          tickLine={false}
          tickMargin={6}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={3} />
      </BarChart>
    </ChartContainer>
  )
}

// Per-bucket optimizer savings (area, left axis) with the running cumulative
// total (line, right axis) so the window reads both "how much each hour saved"
// and "how much has been saved so far".
export function BandwidthSavedChart({ data }: { data: TimePoint[] }) {
  const config = {
    saved: { label: 'Saved', color: 'var(--chart-2)' },
    cumulative: { label: 'Cumulative', color: 'var(--chart-1)' },
  } satisfies ChartConfig
  let running = 0
  const chartData = data.map((d) => {
    running += d.bandwidthSaved
    return { label: d.label, saved: d.bandwidthSaved, cumulative: running }
  })
  if (running === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-muted-foreground text-sm">
        No savings in this window yet.
      </div>
    )
  }
  return (
    <ChartContainer className="aspect-auto h-56 w-full" config={config}>
      <ComposedChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(v: number) => humanBytes(v, 0)}
          tickLine={false}
          width={52}
          yAxisId="left"
        />
        <YAxis
          axisLine={false}
          orientation="right"
          tickFormatter={(v: number) => humanBytes(v, 0)}
          tickLine={false}
          width={52}
          yAxisId="right"
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          dataKey="saved"
          fill="var(--color-saved)"
          fillOpacity={0.18}
          stroke="var(--color-saved)"
          type="monotone"
          yAxisId="left"
        />
        <Line
          dataKey="cumulative"
          dot={false}
          stroke="var(--color-cumulative)"
          strokeWidth={2}
          type="monotone"
          yAxisId="right"
        />
        <ChartLegend content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  )
}

// Requests over time stacked by HTTP status class. 2xx/3xx read as healthy
// (green / muted) so any 4xx (warning) or 5xx (destructive) band stands out.
export function StatusAreaChart({ data }: { data: StatusPoint[] }) {
  const config = {
    success: { label: '2xx', color: 'var(--success)' },
    redirect: { label: '3xx', color: 'var(--muted-foreground)' },
    clientError: { label: '4xx', color: 'var(--warning)' },
    serverError: { label: '5xx', color: 'var(--destructive)' },
  } satisfies ChartConfig
  const keys = ['success', 'redirect', 'clientError', 'serverError']
  const allZero = data.every(
    (d) => d.success + d.redirect + d.clientError + d.serverError === 0,
  )
  if (allZero) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-muted-foreground text-sm">
        No requests in this window yet.
      </div>
    )
  }
  return (
    <ChartContainer className="aspect-auto h-56 w-full" config={config}>
      <AreaChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(v: number) => compactNumber(v, 0)}
          tickLine={false}
          width={48}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Area
            dataKey={k}
            fill={`var(--color-${k})`}
            fillOpacity={0.2}
            key={k}
            stackId="a"
            stroke={`var(--color-${k})`}
            type="monotone"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </AreaChart>
    </ChartContainer>
  )
}

// p50/p95/p99 as lines over the window — the moving companion to the latency
// histogram, so a creeping tail shows up before it dominates the total.
export function LatencyTrendChart({ data }: { data: LatencyTrendPoint[] }) {
  const config = {
    p50: { label: 'p50', color: 'var(--muted-foreground)' },
    p95: { label: 'p95', color: 'var(--warning)' },
    p99: { label: 'p99', color: 'var(--destructive)' },
  } satisfies ChartConfig
  const keys = ['p50', 'p95', 'p99']
  if (data.every((d) => d.p50 + d.p95 + d.p99 === 0)) {
    return (
      <div className="flex h-56 items-center justify-center text-center text-muted-foreground text-sm">
        No requests in this window yet.
      </div>
    )
  }
  return (
    <ChartContainer className="aspect-auto h-56 w-full" config={config}>
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={24}
          tickLine={false}
          tickMargin={8}
        />
        <YAxis
          axisLine={false}
          tickFormatter={(v: number) => `${v}ms`}
          tickLine={false}
          width={52}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {keys.map((k) => (
          <Line
            dataKey={k}
            dot={false}
            key={k}
            stroke={`var(--color-${k})`}
            strokeWidth={2}
            type="monotone"
          />
        ))}
        <ChartLegend content={<ChartLegendContent />} />
      </LineChart>
    </ChartContainer>
  )
}
