import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { DownloadIcon } from 'lucide-react'
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
import {
  getFinanceDashboardFn,
  getPlatformAnalyticsFn,
} from '@/functions/admin'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import { analyticsSeriesCsv } from '@/helpers/analytics/export-csv'
import type { HistorySearch } from '@/helpers/history/window'
import { compactNumber } from '@/shared/format'

type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalyticsFn>>
type EdgeResult = Awaited<ReturnType<typeof getEdgeCacheStatsFn>>
type FinanceDashboard = Awaited<ReturnType<typeof getFinanceDashboardFn>>

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
  const [finance, setFinance] = useState<FinanceDashboard | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const downloadAnalytics = () => {
    if (!data) {
      return
    }
    const url = URL.createObjectURL(
      new Blob([analyticsSeriesCsv(data.series, edge?.edge?.series)], {
        type: 'text/csv',
      }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `keenpix-platform-analytics-${data.window.from.slice(0, 10)}-${data.window.to.slice(0, 10)}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const load = useCallback(async (next: HistorySearch) => {
    setRefreshing(true)
    setLoadError(false)
    try {
      const [analytics, edgeResult, financeResult] = await Promise.all([
        getPlatformAnalyticsFn({ data: next }),
        getEdgeCacheStatsFn({ data: next }).catch(() => null),
        getFinanceDashboardFn({ data: next }),
      ])
      setData(analytics)
      setEdge(edgeResult)
      setFinance(financeResult)
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
      <Button
        aria-label="Export platform analytics CSV"
        className="h-11"
        disabled={!data}
        onClick={downloadAnalytics}
        size="sm"
        variant="outline"
      >
        <DownloadIcon aria-hidden="true" />
        Export CSV
      </Button>
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
  const edgeStats = edge?.edge ?? null
  const imageRequests = summary.totalRequests + (edgeStats?.cachedRequests ?? 0)
  const deliveredImages =
    summary.successfulDeliveries + (edgeStats?.cachedRequests ?? 0)
  const maxCustomerRequests = Math.max(
    ...topCustomers.map((customer) => customer.requests),
    1,
  )
  const totalPlanned = planDistribution.reduce((sum, row) => sum + row.count, 0)
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
  const optimizedShare =
    summary.successfulDeliveries === 0
      ? 0
      : (summary.liveOptimizations / summary.successfulDeliveries) * 100
  let profitSubtitle = `${finance?.profit.marginPct?.toFixed(1)}% margin`
  if (!finance?.costModelConfigured) {
    profitSubtitle = 'Configure in Admin Settings'
  } else if (finance.profit.actualCents === null) {
    profitSubtitle = 'Polar cost data unavailable'
  } else if (finance.revenue.actualCents === 0) {
    profitSubtitle = 'No revenue in period'
  }
  return (
    <div className="flex flex-col gap-6">
      {controls}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Image requests"
          sub={`${compactNumber(deliveredImages)} delivered`}
          value={compactNumber(imageRequests)}
        />
        <StatCard
          label="Edge optimized"
          sub="Cloudflare edge cache"
          value={edgeStats ? compactNumber(edgeStats.cachedRequests) : '—'}
        />
        <StatCard
          label="Cache optimized"
          sub={`${summary.hitRate.toFixed(1)}% of requests reaching Keenpix`}
          value={compactNumber(summary.cacheHits)}
        />
        <StatCard
          label="Optimized"
          sub={`${optimizedShare.toFixed(1)}% of successful Keenpix requests`}
          value={compactNumber(summary.liveOptimizations)}
        />
        <StatCard
          label="Failed"
          sub="Non-2xx Keenpix requests"
          value={compactNumber(summary.failedRequests)}
        />
      </div>

      {!edge?.edgeCovered && edge?.edgeConfigured ? (
        <p className="text-muted-foreground text-xs">
          Cloudflare totals include every captured source in this window, but
          uncovered intervals are not estimated.
          {edge.edgeError ? ` Latest capture error: ${edge.edgeError}` : ''}
          {edge.edgeLastSuccessAt
            ? ` Last successful capture ${dayjs(edge.edgeLastSuccessAt).format('MMM D, YYYY HH:mm')}.`
            : ''}
        </p>
      ) : null}

      <ChartAreaInteractive data={series} edge={edgeStats?.series} funnel />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-semibold text-lg">Finances</h2>
          <p className="text-muted-foreground text-sm">
            Settled Polar revenue reconciled with configured operating costs.
            MRR is the current subscription commitment.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Actual revenue"
            sub={
              finance?.revenue.source === 'polar'
                ? `${finance.revenue.orders ?? 0} settled order${finance.revenue.orders === 1 ? '' : 's'}`
                : 'Polar metrics unavailable'
            }
            value={
              finance?.revenue.actualCents === null || !finance
                ? '—'
                : money.format(finance.revenue.actualCents / 100)
            }
          />
          <StatCard
            label="Actual costs"
            sub={
              finance?.costModelConfigured
                ? 'Payment and operating costs'
                : 'Configure in Admin Settings'
            }
            value={
              finance?.costModelConfigured &&
              finance.cost.actualTotalCents !== null
                ? money.format(finance.cost.actualTotalCents / 100)
                : '—'
            }
          />
          <StatCard
            label="Actual profit"
            sub={profitSubtitle}
            value={
              finance?.profit.actualCents === null ||
              !finance?.costModelConfigured
                ? '—'
                : money.format(finance.profit.actualCents / 100)
            }
          />
          <StatCard
            label="Current MRR"
            sub={`${data.activePaidSubscriptionCount} active paid subscription${data.activePaidSubscriptionCount === 1 ? '' : 's'}`}
            value={money.format(data.paidMrrCents / 100)}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Revenue is settled order data. Costs use the editable model in Admin
          Settings; Edge costs remain platform-wide and are never assigned to a
          tenant.
        </p>
      </section>

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
