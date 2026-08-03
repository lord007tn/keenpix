import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { mergeFunnel } from '@/helpers/analytics/funnel'
import { compactNumber } from '@/shared/format'
import type { EdgeCachePoint, TimePoint } from '@/shared/types'

const originConfig = {
  cached: { label: 'Cache', color: 'var(--chart-2)' },
  optimized: { label: 'Optimized', color: 'var(--chart-1)' },
} satisfies ChartConfig

// The delivery stages captured independently at Cloudflare and keenpix. The
// caller is responsible for showing any partial-coverage warning.
const funnelConfig = {
  edgeServed: {
    label: 'Edge',
    color: 'var(--chart-1)',
  },
  diskServed: {
    label: 'Cache',
    color: 'var(--chart-2)',
  },
  liveProcessed: {
    label: 'Optimized',
    color: 'var(--muted-foreground)',
  },
} satisfies ChartConfig

export function ChartAreaInteractive({
  data,
  edge,
  funnel,
}: {
  data: TimePoint[]
  edge?: EdgeCachePoint[]
  funnel?: boolean
}) {
  const showFunnel = Boolean(funnel && edge && edge.length > 0)
  const config = showFunnel ? funnelConfig : originConfig
  const keys = Object.keys(config)
  const funnelRows = showFunnel ? mergeFunnel(data, edge ?? []) : null
  const chartData: object[] = funnelRows ?? data
  const allZero = funnelRows
    ? funnelRows.every(
        (d) => d.edgeServed + d.diskServed + d.liveProcessed === 0,
      )
    : data.every((d) => d.requests === 0)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Requests over time</CardTitle>
        <CardDescription>
          {showFunnel
            ? 'Edge, cache, and optimized delivery stages, this window'
            : 'Cache vs optimized origin delivery, this window'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {allZero ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
            No requests in this period yet.
          </div>
        ) : (
          <ChartContainer
            className="aspect-auto h-[250px] w-full"
            config={config}
          >
            <AreaChart accessibilityLayer data={chartData}>
              <defs>
                {keys.map((k) => (
                  <linearGradient
                    id={`fill-${k}`}
                    key={k}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${k})`}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${k})`}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="label"
                minTickGap={32}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickFormatter={(v: number) => compactNumber(v, 0)}
                tickLine={false}
                width={44}
              />
              <ChartTooltip
                content={<ChartTooltipContent indicator="dot" />}
                cursor={false}
              />
              {keys.map((k) => (
                <Area
                  dataKey={k}
                  fill={`url(#fill-${k})`}
                  key={k}
                  stackId="a"
                  stroke={`var(--color-${k})`}
                  type="monotone"
                />
              ))}
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
