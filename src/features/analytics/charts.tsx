import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { fmtBytes, fmtNum } from '@/shared/format'
import type { FormatSlice, LatencyBin, TimePoint } from '@/shared/types'

export type AreaView = 'requests' | 'bandwidth' | 'cache'

type AreaPoint = TimePoint | (TimePoint & { hit: number })

interface AreaBuild {
  chartData: AreaPoint[]
  config: ChartConfig
  keys: string[]
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
      yFormat: (v: number) => fmtBytes(v, 0),
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
        hit: d.requests === 0 ? 0 : (d.cached / d.requests) * 100,
      })),
      yFormat: (v: number) => `${Math.round(v)}%`,
    }
  }
  return {
    config: {
      cached: { label: 'Cache hit', color: 'var(--chart-2)' },
      optimized: { label: 'Optimized live', color: 'var(--chart-1)' },
    } satisfies ChartConfig,
    keys: ['cached', 'optimized'],
    chartData: data,
    yFormat: (v: number) => fmtNum(v, 0),
  }
}

export function AnalyticsAreaChart({
  data,
  view,
}: {
  data: TimePoint[]
  view: AreaView
}) {
  const { config, keys, chartData, yFormat } = buildArea(data, view)
  return (
    <ChartContainer className="aspect-auto h-60 w-full" config={config}>
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
    <div className="relative">
      <ChartContainer className="mx-auto aspect-square h-44" config={config}>
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
        <span className="font-semibold text-xl tabular-nums">{top.value}%</span>
        <span className="text-muted-foreground text-xs">{top.label}</span>
      </div>
    </div>
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
