import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { HistoryRangePicker } from '@/components/app/history-range-picker'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { StatCard } from '@/components/app/stat-card'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import { getPlatformAnalyticsFn } from '@/functions/admin'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import type { HistorySearch } from '@/helpers/history/window'
import { compactNumber, humanBytes } from '@/shared/format'

type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalyticsFn>>
type EdgeResult = Awaited<ReturnType<typeof getEdgeCacheStatsFn>>

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

export function PlatformAnalyticsView() {
  const [search, setSearch] = useState<HistorySearch>({ range: '30d' })
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [edge, setEdge] = useState<EdgeResult | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async (next: HistorySearch) => {
    setRefreshing(true)
    setLoadError(false)
    try {
      const [analytics, edgeResult] = await Promise.all([
        getPlatformAnalyticsFn({ data: next }),
        getEdgeCacheStatsFn({ data: next }).catch(() => null),
      ])
      setData(analytics)
      setEdge(edgeResult)
    } catch (error) {
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Could not load platform analytics'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(search)
  }, [load, search])

  const controls = (
    <div className="flex items-center justify-end gap-2">
      <RefreshingIndicator active={refreshing} />
      <HistoryRangePicker
        from={search.from}
        label="Platform analytics"
        maxDays={3650}
        onChange={setSearch}
        range={search.range}
        to={search.to}
      />
    </div>
  )

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {controls}
        {loadError ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-destructive text-sm">
              Couldn’t load platform analytics.
            </p>
            <Button onClick={() => load(search)} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['requests', 'bandwidth', 'cache', 'edge'].map((key) => (
              <Skeleton className="h-24" key={key} />
            ))}
          </div>
        )}
      </div>
    )
  }

  const { summary, series, topCustomers, planDistribution } = data
  const edgeStats = edge?.edgeCovered ? edge.edge : null
  const edgeHitRate = edgeStats?.hitRate ?? null
  let edgeValue = 'Not configured'
  let edgeSub = 'Configure CLOUDFLARE_* in the platform environment'
  if (edge?.edgeStatus === 'failed') {
    edgeValue = 'Capture failed'
    edgeSub = edge.edgeError ?? 'Check the token, zone, and capture logs'
  } else if (edge?.edgeStatus === 'partial') {
    edgeValue = 'Partial history'
    edgeSub = edge.edgeLastSuccessAt
      ? `Last capture ${dayjs(edge.edgeLastSuccessAt).format('MMM D, HH:mm')}`
      : 'The selected window is still accumulating'
  } else if (edge?.edgeStatus === 'ok_empty') {
    edgeValue = '0%'
    edgeSub = 'Connected; no matching edge traffic in this window'
  } else if (edgeHitRate !== null) {
    edgeValue = `${edgeHitRate.toFixed(1)}%`
    edgeSub = `${compactNumber(edgeStats?.requests ?? 0)} edge requests`
  }
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
        <StatCard label="Cloudflare edge" sub={edgeSub} value={edgeValue} />
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
