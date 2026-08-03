import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { getFinanceDashboardFn } from '@/functions/admin'
import type { HistorySearch } from '@/helpers/history/window'
import { compactNumber, humanBytes } from '@/shared/format'
import { FinanceSettingsDialog } from './finance-settings-dialog'

type FinanceDashboard = Awaited<ReturnType<typeof getFinanceDashboardFn>>

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

export function PlatformFinances() {
  const [search, setSearch] = useState<HistorySearch>({ range: '30d' })
  const [data, setData] = useState<FinanceDashboard | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async (next: HistorySearch) => {
    setRefreshing(true)
    setLoadError(false)
    try {
      setData(await getFinanceDashboardFn({ data: next }))
    } catch (error) {
      setLoadError(true)
      toast.error(getErrorMessage(error, 'Could not load finances'))
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(search)
  }, [load, search])

  const controls = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <RefreshingIndicator active={refreshing} />
      <HistoryRangePicker
        from={search.from}
        label="Financial period"
        maxDays={3650}
        onChange={setSearch}
        range={search.range}
        to={search.to}
      />
      <FinanceSettingsDialog onSaved={() => load(search)} />
    </div>
  )

  if (!data) {
    return (
      <div className="flex flex-col gap-6">
        {controls}
        {loadError ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-destructive text-sm">Couldn’t load finances.</p>
            <Button onClick={() => load(search)} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['revenue', 'mrr', 'cost', 'profit'].map((key) => (
              <Skeleton className="h-28" key={key} />
            ))}
          </div>
        )}
      </div>
    )
  }

  let profitSubtitle = `${data.profit.marginPct?.toFixed(1)}% margin`
  if (!data.costModelConfigured) {
    profitSubtitle = 'Configure cost assumptions first'
  } else if (data.profit.actualCents === null) {
    profitSubtitle = 'Polar cost data unavailable'
  } else if (data.revenue.actualCents === 0) {
    profitSubtitle = 'No revenue in period'
  }

  return (
    <div className="flex flex-col gap-6">
      {controls}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Actual revenue"
          sub={
            data.revenue.source === 'polar'
              ? `${data.revenue.orders ?? 0} settled orders in period`
              : 'Polar metrics unavailable'
          }
          value={
            data.revenue.actualCents === null
              ? '—'
              : money.format(data.revenue.actualCents / 100)
          }
        />
        <StatCard
          label="Paid MRR"
          sub={`${data.revenue.paidSubscriptions} active paid subscriptions`}
          value={money.format(data.revenue.paidMrrCents / 100)}
        />
        <StatCard
          label="Actual costs"
          sub={
            data.costModelConfigured
              ? 'Payment and operating costs'
              : 'Configure cost assumptions first'
          }
          value={
            data.costModelConfigured && data.cost.actualTotalCents !== null
              ? money.format(data.cost.actualTotalCents / 100)
              : '—'
          }
        />
        <StatCard
          label="Actual profit"
          sub={profitSubtitle}
          value={
            data.profit.actualCents === null || !data.costModelConfigured
              ? '—'
              : money.format(data.profit.actualCents / 100)
          }
        />
      </div>

      {data.costModelConfigured ? null : (
        <p className="text-sm text-warning-text">
          Operating cost and profit remain blank until you save the financial
          cost model.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost breakdown</CardTitle>
            <CardDescription>
              Configured assumptions prorated from{' '}
              {dayjs(data.window.from).format('MMM D, YYYY')} through{' '}
              {dayjs(data.window.to)
                .subtract(1, 'millisecond')
                .format('MMM D, YYYY')}
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b pb-3 text-sm">
              <span className="text-muted-foreground">Payment processing</span>
              <span className="font-medium tabular-nums">
                {data.revenue.paymentCostCents === null
                  ? '—'
                  : money.format(data.revenue.paymentCostCents / 100)}
              </span>
            </div>
            {[
              ['Fixed operations', data.cost.fixedCents],
              ['Keenpix requests', data.cost.originRequestCents],
              ['Keenpix bandwidth', data.cost.originBandwidthCents],
              ['Edge requests', data.cost.edgeRequestCents],
              ['Edge bandwidth', data.cost.edgeBandwidthCents],
            ].map(([label, cents]) => (
              <div
                className="flex items-center justify-between border-b pb-3 text-sm last:border-0 last:pb-0"
                key={label}
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">
                  {money.format(Number(cents) / 100)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3 font-semibold text-sm">
              <span>Total actual costs</span>
              <span className="tabular-nums">
                {data.cost.actualTotalCents === null
                  ? '—'
                  : money.format(data.cost.actualTotalCents / 100)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery economics</CardTitle>
            <CardDescription>
              Reconciled platform usage behind the variable cost calculation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              [
                'Origin delivery',
                `${compactNumber(data.usage.originRequests)} requests · ${humanBytes(data.usage.originBandwidthBytes)}`,
              ],
              [
                'Edge delivery',
                `${compactNumber(data.usage.edgeRequests)} requests · ${humanBytes(data.usage.edgeBandwidthBytes)}`,
              ],
              [
                'Monthly fixed costs',
                money.format(data.cost.fixedMonthlyCents / 100),
              ],
              [
                'MRR after fixed costs',
                money.format(data.profit.projectedMonthlyCents / 100),
              ],
            ].map(([label, value]) => (
              <div
                className="flex items-center justify-between gap-3 border-b pb-3 text-sm last:border-0 last:pb-0"
                key={label}
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Actual revenue and payment costs come from settled Polar metrics.
        Operating costs come from the saved cost model. Edge coverage for this
        range is {data.usage.edgeCovered ? 'complete' : 'partial'}; uncovered
        Edge usage is not estimated. Customer contribution excludes Edge costs
        because the Cloudflare zone dataset cannot identify a Keenpix customer.
      </p>
    </div>
  )
}
