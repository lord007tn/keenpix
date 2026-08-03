import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
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
import { compactNumber, humanBytes } from '@/shared/format'

type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalyticsFn>>
type EdgeResult = Awaited<ReturnType<typeof getEdgeCacheStatsFn>>
type FinanceDashboard = Awaited<ReturnType<typeof getFinanceDashboardFn>>

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

export function PlatformOverview() {
  const [data, setData] = useState<PlatformAnalytics | null>(null)
  const [edge, setEdge] = useState<EdgeResult | null>(null)
  const [finance, setFinance] = useState<FinanceDashboard | null>(null)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const [analytics, edgeResult, financeResult] = await Promise.all([
        getPlatformAnalyticsFn({ data: { range: '30d' } }),
        getEdgeCacheStatsFn({ data: { range: '30d' } }).catch(() => null),
        getFinanceDashboardFn({ data: { range: '30d' } }),
      ])
      setData(analytics)
      setEdge(edgeResult)
      setFinance(financeResult)
    } catch (error) {
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Could not load platform analytics'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    if (loadError) {
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-destructive text-sm">
            Couldn’t load the platform overview.
          </p>
          <Button onClick={load} size="sm" variant="outline">
            Try again
          </Button>
        </div>
      )
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {['customers', 'requests', 'bandwidth', 'cache'].map((key) => (
          <Skeleton className="h-24" key={key} />
        ))}
      </div>
    )
  }

  const { summary, series, topCustomers, planDistribution } = data
  const edgeStats = edge?.edge
  const totalRequests = summary.totalRequests + (edgeStats?.cachedRequests ?? 0)
  const totalBandwidth = summary.bandwidthOut + (edgeStats?.bytesFromEdge ?? 0)
  const delivered =
    summary.successfulDeliveries + (edgeStats?.cachedRequests ?? 0)
  const optimized = summary.liveOptimizations
  const cacheOptimized = summary.cacheHits
  const totalCached = cacheOptimized + (edgeStats?.cachedRequests ?? 0)
  const cacheRate = delivered > 0 ? (totalCached / delivered) * 100 : 0
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  })
  const maxCustomerRequests = Math.max(
    ...topCustomers.map((customer) => customer.requests),
    1,
  )
  const totalPlanned = planDistribution.reduce((sum, row) => sum + row.count, 0)
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Paid MRR"
          sub={`${data.activePaidSubscriptionCount} active paid · ${data.complimentaryCustomerCount} complimentary`}
          value={`$${(data.paidMrrCents / 100).toFixed(2)}`}
        />
        <StatCard
          label="Actual costs (30d)"
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
          label="Profit (30d)"
          sub={profitSubtitle}
          value={
            finance?.profit.actualCents === null ||
            !finance?.costModelConfigured
              ? '—'
              : money.format(finance.profit.actualCents / 100)
          }
        />
        <StatCard
          label="Customers"
          sub={`${data.servedCount} served · ${data.suspendedCount} suspended`}
          value={String(data.customerCount)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Image requests (30d)"
          sub={`${compactNumber(delivered)} delivered`}
          value={compactNumber(totalRequests)}
        />
        <StatCard
          label="Edge optimized"
          sub={
            edge?.edgeCovered
              ? 'Complete Edge coverage'
              : 'Partial Edge coverage'
          }
          value={edgeStats ? compactNumber(edgeStats.cachedRequests) : '—'}
        />
        <StatCard
          label="Cache optimized"
          sub="Served from Keenpix cache"
          value={compactNumber(cacheOptimized)}
        />
        <StatCard
          label="Optimized"
          sub="Freshly optimized by Keenpix"
          value={compactNumber(optimized)}
        />
        <StatCard
          label="Failed"
          sub="Non-2xx Keenpix requests"
          value={compactNumber(summary.failedRequests)}
        />
        <StatCard
          label="Bandwidth delivered (30d)"
          sub={`${humanBytes(summary.bandwidthSaved)} saved`}
          value={humanBytes(totalBandwidth)}
        />
        <StatCard
          label="Cache hit rate"
          sub={`${summary.savingsPct.toFixed(0)}% bytes saved`}
          value={`${cacheRate.toFixed(1)}%`}
        />
      </div>

      <ChartAreaInteractive data={series} edge={edgeStats?.series} funnel />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <CardTitle>Top customers</CardTitle>
                <CardDescription>By requests over 30 days.</CardDescription>
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
              <p className="text-muted-foreground text-sm">No traffic yet.</p>
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
                    {humanBytes(customer.bandwidthBytes)}
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
