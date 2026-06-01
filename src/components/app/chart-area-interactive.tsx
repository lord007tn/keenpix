import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import {
  Card,
  CardAction,
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  type AnalyticsRange,
  isAnalyticsRange,
  type TimePoint,
} from '@/shared/types'

const chartConfig = {
  cached: { label: 'Cache hits', color: 'var(--chart-2)' },
  optimized: { label: 'Optimized', color: 'var(--chart-1)' },
} satisfies ChartConfig

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '90d', label: '90 days' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
  { value: '24h', label: '24 hours' },
]

export function ChartAreaInteractive({
  data,
  range,
  onRangeChange,
}: {
  data: TimePoint[]
  range: AnalyticsRange
  onRangeChange: (range: AnalyticsRange) => void
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Requests over time</CardTitle>
        <CardDescription>
          Cache hits vs live-optimized, this window
        </CardDescription>
        <CardAction>
          <ToggleGroup
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (isAnalyticsRange(next)) {
                onRangeChange(next)
              }
            }}
            size="sm"
            value={[range]}
            variant="outline"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
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
      </CardContent>
    </Card>
  )
}
