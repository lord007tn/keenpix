import { RFCDate } from '@polar-sh/sdk/types/rfcdate'
import dayjs from 'dayjs'
import { createPolarClient } from '@/lib/billing/polar-client'
import { errorContext, logger } from '@/lib/logger/logger'

const POLAR_METRICS_TIMEOUT_MS = 5000

export async function getPlatformFinance(gte: Date, lt: Date) {
  const client = createPolarClient()
  if (!client) {
    return {
      source: 'unavailable',
      revenueCents: null,
      costCents: null,
      profitCents: null,
      profitMarginPct: null,
      orders: null,
    }
  }

  const days = Math.max(1, dayjs(lt).diff(gte, 'day'))
  let interval: 'day' | 'month' | 'week' = 'day'
  if (days > 730) {
    interval = 'month'
  } else if (days > 90) {
    interval = 'week'
  }
  const request = client.metrics
    .get({
      startDate: new RFCDate(dayjs(gte).format('YYYY-MM-DD')),
      endDate: new RFCDate(
        dayjs(lt).subtract(1, 'millisecond').format('YYYY-MM-DD'),
      ),
      interval,
      metrics: [
        'orders',
        'revenue',
        'costs',
        'gross_margin',
        'gross_margin_percentage',
      ],
      timezone: 'UTC',
    })
    .catch((error) => {
      logger.warn(
        errorContext(error),
        'platform finance: Polar metrics lookup failed',
      )
      return null
    })
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), POLAR_METRICS_TIMEOUT_MS).unref?.()
  })
  const metrics = await Promise.race([request, timeout])

  if (!metrics) {
    return {
      source: 'unavailable',
      revenueCents: null,
      costCents: null,
      profitCents: null,
      profitMarginPct: null,
      orders: null,
    }
  }

  const costsTracked = Boolean(metrics.metrics.costs)
  const profitTracked = Boolean(metrics.metrics.grossMargin)
  return {
    source: 'polar',
    revenueCents: metrics.totals.revenue ?? 0,
    costCents: costsTracked ? (metrics.totals.costs ?? 0) : null,
    profitCents: profitTracked ? (metrics.totals.grossMargin ?? 0) : null,
    profitMarginPct: profitTracked
      ? (metrics.totals.grossMarginPercentage ?? 0)
      : null,
    orders: metrics.totals.orders ?? 0,
  }
}
