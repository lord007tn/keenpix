import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { StatCard } from '@/components/app/stat-card'
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
import { compactNumber, humanBytes } from '@/shared/format'

type PlatformAnalytics = Awaited<ReturnType<typeof getPlatformAnalyticsFn>>

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
  business: 'Business',
}

export function PlatformOverview() {
  const [data, setData] = useState<PlatformAnalytics | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await getPlatformAnalyticsFn({ data: { range: '30d' } }))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not load platform analytics'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {['customers', 'requests', 'bandwidth', 'cache'].map((key) => (
          <Skeleton className="h-24" key={key} />
        ))}
      </div>
    )
  }

  const { summary, series, topCustomers, planDistribution } = data
  const maxCustomerRequests = Math.max(
    ...topCustomers.map((customer) => customer.requests),
    1,
  )
  const totalPlanned = planDistribution.reduce((sum, row) => sum + row.count, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Paid MRR"
          sub={`${data.activePaidSubscriptionCount} active paid · ${data.complimentaryCustomerCount} complimentary`}
          value={`$${(data.paidMrrCents / 100).toFixed(2)}`}
        />
        <StatCard
          label="Customers"
          sub={`${data.servedCount} served · ${data.suspendedCount} suspended`}
          value={String(data.customerCount)}
        />
        <StatCard
          label="Requests (30d)"
          sub="across all customers"
          value={compactNumber(summary.totalRequests)}
        />
        <StatCard
          label="Bandwidth (30d)"
          sub={`${humanBytes(summary.bandwidthSaved)} saved`}
          value={humanBytes(summary.bandwidthOut)}
        />
        <StatCard
          label="Cache hit rate"
          sub={`${summary.savingsPct.toFixed(0)}% bytes saved`}
          value={`${summary.hitRate.toFixed(1)}%`}
        />
      </div>

      <ChartAreaInteractive data={series} />

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
