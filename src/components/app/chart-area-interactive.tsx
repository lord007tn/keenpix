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
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { compactNumber } from '@/shared/format'
import type { TimePoint } from '@/shared/types'

const chartConfig = {
  cached: { label: 'Cache hits', color: 'var(--chart-2)' },
  optimized: { label: 'Optimized', color: 'var(--chart-1)' },
} satisfies ChartConfig

export function ChartAreaInteractive({ data }: { data: TimePoint[] }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Requests over time</CardTitle>
        <CardDescription>
          Cache hits vs live-optimized, this window
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.every((d) => d.requests === 0) ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
            No requests in this period yet.
          </div>
        ) : (
          <ChartContainer
            className="aspect-auto h-[250px] w-full"
            config={chartConfig}
          >
            <AreaChart accessibilityLayer data={data}>
              <defs>
                <linearGradient id="fillOptimized" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-optimized)"
                    stopOpacity={1}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-optimized)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillCached" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-cached)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-cached)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
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
              <Area
                dataKey="cached"
                fill="url(#fillCached)"
                stackId="a"
                stroke="var(--color-cached)"
                type="natural"
              />
              <Area
                dataKey="optimized"
                fill="url(#fillOptimized)"
                stackId="a"
                stroke="var(--color-optimized)"
                type="natural"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
