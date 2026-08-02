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
import { getPlatformAnalyticsFn } from '@/functions/admin'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import { analyticsSeriesCsv } from '@/helpers/analytics/export-csv'
import type { HistorySearch } from '@/helpers/history/window'
import { compactNumber } from '@/shared/format'

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
  const edgeCoverageSub = edge?.edgeCovered
    ? 'Complete Cloudflare coverage for this window'
    : 'Partial Cloudflare history for this window'
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
  let costSub = 'Polar metrics unavailable'
  if (data.finance.source === 'polar') {
    costSub =
      data.finance.costCents === null
        ? 'Enable Polar Cost Insights'
        : 'Recorded delivery costs'
  }

  return (
    <div className="flex flex-col gap-6">
      {controls}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Client requests observed at Cloudflare"
          sub={edgeStats ? edgeCoverageSub : 'Cloudflare data unavailable'}
          value={edgeStats ? compactNumber(edgeStats.requests) : '—'}
        />
        <StatCard
          label="Edge optimized"
          sub={
            edgeStats
              ? `${edgeStats.hitRate.toFixed(1)}% of observed edge requests`
              : 'Cloudflare data unavailable'
          }
          value={edgeStats ? compactNumber(edgeStats.cachedRequests) : '—'}
        />
        <StatCard
          label="Cache optimized"
          sub={`${summary.hitRate.toFixed(1)}% of requests reaching Keenpix`}
          value={compactNumber(summary.cacheHits)}
        />
        <StatCard
          label="Newly optimized"
          sub={`${optimizedShare.toFixed(1)}% of successful Keenpix requests`}
          value={compactNumber(summary.liveOptimizations)}
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
            Settled Polar orders for the selected calendar dates. MRR is the
            current subscription commitment.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Actual revenue"
            sub={
              data.finance.source === 'polar'
                ? `${data.finance.orders ?? 0} settled order${data.finance.orders === 1 ? '' : 's'}`
                : 'Polar metrics unavailable'
            }
            value={
              data.finance.revenueCents === null
                ? '—'
                : money.format(data.finance.revenueCents / 100)
            }
          />
          <StatCard
            label="Actual costs"
            sub={costSub}
            value={
              data.finance.costCents === null
                ? '—'
                : money.format(data.finance.costCents / 100)
            }
          />
          <StatCard
            label="Gross profit"
            sub={
              data.finance.profitMarginPct === null
                ? 'Requires recorded costs'
                : `${data.finance.profitMarginPct.toFixed(1)}% gross margin`
            }
            value={
              data.finance.profitCents === null
                ? '—'
                : money.format(data.finance.profitCents / 100)
            }
          />
          <StatCard
            label="Current MRR"
            sub={`${data.activePaidSubscriptionCount} active paid subscription${data.activePaidSubscriptionCount === 1 ? '' : 's'}`}
            value={money.format(data.paidMrrCents / 100)}
          />
        </div>
        {data.finance.source === 'polar' && data.finance.costCents === null ? (
          <p className="text-muted-foreground text-xs">
            Revenue is settled order data. Cost and profit stay blank until
            delivery-cost events are recorded in Polar Cost Insights.
          </p>
        ) : null}
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
