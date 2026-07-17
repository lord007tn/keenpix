import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { StatCard } from '@/components/app/stat-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorMessage } from '@/errors/common'
import { getPlatformAnalyticsFn } from '@/functions/admin'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import { compactNumber, humanBytes } from '@/shared/format'
import { type AnalyticsRange, isAnalyticsRange } from '@/shared/types'

type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalyticsFn>>
type EdgeResult = Awaited<ReturnType<typeof getEdgeCacheStatsFn>>

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '90d', label: '90 days' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
  { value: '24h', label: '24 hours' },
]

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

export function PlatformAnalyticsView() {
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [edge, setEdge] = useState<EdgeResult | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (next: AnalyticsRange) => {
    setRefreshing(true)
    try {
      const [analytics, edgeResult] = await Promise.all([
        getPlatformAnalyticsFn({ data: { range: next } }),
        getEdgeCacheStatsFn({ data: { range: next } }).catch(() => null),
      ])
      setData(analytics)
      setEdge(edgeResult)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load platform analytics'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(range)
  }, [load, range])

  const controls = (
    <div className="flex items-center justify-end gap-2">
      <RefreshingIndicator active={refreshing} />
      <ToggleGroup
        onValueChange={(value: string[]) => {
          const next = value[0]
          if (isAnalyticsRange(next)) {
            setRange(next)
          }
        }}
        size="sm"
        value={[range]}
        variant="outline"
      >
        {RANGES.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {controls}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['requests', 'bandwidth', 'cache', 'edge'].map((key) => (
            <Skeleton className="h-24" key={key} />
          ))}
        </div>
      </div>
    )
  }

  const { summary, series, topCustomers, planDistribution } = data
  const edgeStats = edge?.edge
  const edgeHitRate =
    edgeStats && edgeStats.requests > 0
      ? (edgeStats.cachedRequests / edgeStats.requests) * 100
      : null
  const maxCustomerRequests = Math.max(
    ...topCustomers.map((customer) => customer.requests),
    1,
  )
  const totalPlanned = planDistribution.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="flex flex-col gap-6">
      {controls}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Requests"
          sub={`${summary.hitRate.toFixed(0)}% cached`}
          value={compactNumber(summary.totalRequests)}
        />
        <StatCard
          label="Bandwidth delivered"
          sub={`${humanBytes(summary.bandwidthSaved)} saved`}
          value={humanBytes(summary.bandwidthOut)}
        />
        <StatCard
          label="Origin cache hit"
          sub={`${summary.savingsPct.toFixed(0)}% bytes saved`}
          value={`${summary.hitRate.toFixed(1)}%`}
        />
        {edgeHitRate === null ? (
          <StatCard
            label="Avg latency"
            sub={`p95 ${summary.p95}ms`}
            value={`${summary.avg}ms`}
          />
        ) : (
          <StatCard
            label="Edge cache hit"
            sub={`${compactNumber(edgeStats?.requests ?? 0)} edge requests`}
            value={`${edgeHitRate.toFixed(1)}%`}
          />
        )}
      </div>

      <ChartAreaInteractive data={series} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Top customers</CardTitle>
                <CardDescription>By requests in this window.</CardDescription>
              </div>
              <Link
                className="text-muted-foreground text-sm hover:text-foreground"
                to="/admin/customers"
              >
                All customers
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No traffic in this window.
              </p>
            ) : (
              topCustomers.map((customer) => (
                <Link
                  className="relative flex items-center justify-between gap-3 overflow-hidden rounded-md px-2 py-1.5 hover:bg-accent"
                  key={customer.id}
                  params={{ orgId: customer.id }}
                  to="/admin/customers/$orgId"
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
                    style={{
                      width: `${(customer.requests / maxCustomerRequests) * 100}%`,
                    }}
                  />
                  <span className="relative min-w-0 flex-1 truncate font-medium text-sm">
                    {customer.name}
                  </span>
                  <span className="relative shrink-0 text-muted-foreground text-xs tabular-nums">
                    {compactNumber(customer.requests)} req ·{' '}
                    {Math.round(customer.cacheHitRate * 100)}% hit
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan distribution</CardTitle>
            <CardDescription>
              Effective plan across {totalPlanned} customer
              {totalPlanned === 1 ? '' : 's'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {planDistribution.map((row) => {
              const pct =
                totalPlanned > 0 ? (row.count / totalPlanned) * 100 : 0
              return (
                <div className="flex flex-col gap-1" key={row.plan}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{PLAN_LABEL[row.plan] ?? row.plan}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
