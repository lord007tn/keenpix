import { InfoIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { compactNumber, humanBytes } from '@/shared/format'
import type { DashboardKpis, KpiValue } from '@/shared/types'

// Relative change vs the previous window; null means there is no baseline.
function relDelta(v: KpiValue): number | null {
  if (v.prev === 0) {
    return v.value === 0 ? 0 : null
  }
  return ((v.value - v.prev) / v.prev) * 100
}

function TrendBadge({
  delta,
  unit = '%',
}: {
  delta: number | null
  unit?: string
}) {
  if (delta === null) {
    return <Badge variant="outline">New</Badge>
  }
  const up = delta >= 0
  const Icon = up ? TrendingUpIcon : TrendingDownIcon
  return (
    <Badge variant="outline">
      <Icon data-icon="inline-start" />
      {up ? '+' : ''}
      {delta.toFixed(1)}
      {unit}
    </Badge>
  )
}

function trendWord(delta: number | null): string {
  if (delta === null || delta === 0) {
    return 'No change'
  }
  return delta > 0 ? 'Trending up' : 'Trending down'
}

export function SectionCards({ kpis }: { kpis: DashboardKpis }) {
  const reqDelta = relDelta(kpis.requests)
  const bwDelta = relDelta(kpis.bandwidthSaved)
  const hitPp = kpis.hitRate.value - kpis.hitRate.prev
  const p95Delta = relDelta(kpis.p95)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Requests served</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {compactNumber(kpis.requests.value)}
          </CardTitle>
          <CardAction>
            <TrendBadge delta={reqDelta} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 font-medium">
            {trendWord(reqDelta)} vs previous period
          </div>
          <div className="text-muted-foreground">
            Reached keenpix — edge-cached excluded
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="flex w-fit cursor-help items-center gap-1" />
                }
              >
                Bandwidth saved
                <InfoIcon className="size-3" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-0.5">
                  <span>From origin: {humanBytes(kpis.bandwidthIn, 1)}</span>
                  <span>To clients: {humanBytes(kpis.bandwidthOut, 1)}</span>
                  <span>Saved: {humanBytes(kpis.bandwidthSaved.value, 1)}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {humanBytes(kpis.bandwidthSaved.value, 1)}
          </CardTitle>
          <CardAction>
            <TrendBadge delta={bwDelta} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 font-medium">
            {trendWord(bwDelta)} vs previous period
          </div>
          <div className="text-muted-foreground">
            Saved versus serving the originals
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Disk cache hit rate</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {kpis.hitRate.value.toFixed(1)}%
          </CardTitle>
          <CardAction>
            <TrendBadge delta={hitPp} unit="pp" />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 font-medium">
            {trendWord(hitPp)} vs previous period
          </div>
          <div className="text-muted-foreground">
            Served straight from keenpix's disk cache
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>p95 latency</CardDescription>
          <CardTitle className="font-semibold @[250px]/card:text-3xl text-2xl tabular-nums">
            {kpis.p95.value}ms
          </CardTitle>
          <CardAction>
            <TrendBadge delta={p95Delta} />
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 font-medium">Lower is better</div>
          <div className="text-muted-foreground">
            95% of responses were faster
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
