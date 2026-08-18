import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { AnalyticsSummary, LatencyBin } from '@/shared/types'
import { LatencyHistogram } from './charts'
import { PercentileStat } from './percentile-stat'

// The per-request latency breakdown, shared verbatim by Analytics and the
// Overview so the two pages never disagree. Fed the same rollup-derived
// percentiles and histogram bins on both.
type LatencySummary = Pick<
  AnalyticsSummary,
  'avg' | 'p50' | 'p75' | 'p90' | 'p95' | 'p99'
>

export function ResponseLatencyCard({
  bins,
  summary,
}: {
  bins: LatencyBin[]
  summary: LatencySummary
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Response latency</CardTitle>
        <CardDescription>Per-request distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <PercentileStat
            label="avg"
            tone="text-muted-foreground"
            value={String(summary.avg)}
          />
          <PercentileStat
            label="p50"
            tone="text-muted-foreground"
            value={String(summary.p50)}
          />
          <PercentileStat label="p75" tone="" value={String(summary.p75)} />
          <PercentileStat
            label="p90"
            tone="text-warning-text"
            value={String(summary.p90)}
          />
          <PercentileStat
            label="p95"
            tone="text-warning-text"
            value={String(summary.p95)}
          />
          <PercentileStat
            label="p99"
            tone="text-destructive-text"
            value={String(summary.p99)}
          />
        </div>
        <LatencyHistogram data={bins} />
      </CardContent>
    </Card>
  )
}
