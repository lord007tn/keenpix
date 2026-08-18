import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { CustomerDetail } from '@/features/admin/customer-detail'
import { appPageHead } from '@/shared/seo'
import {
  type HistoricalAnalyticsRange,
  isHistoricalAnalyticsRange,
} from '@/shared/types'

const SECTIONS = ['overview', 'plan', 'members'] as const

function getDateParam(value: unknown) {
  if (typeof value !== 'string') {
    return
  }
  const date = dayjs(value)
  return date.isValid() && date.format('YYYY-MM-DD') === value
    ? value
    : undefined
}

export const Route = createFileRoute('/admin/customers/$orgId/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    from?: string
    range?: HistoricalAnalyticsRange
    section?: (typeof SECTIONS)[number]
    to?: string
  } => {
    const range = isHistoricalAnalyticsRange(search.range)
      ? search.range
      : '30d'
    const section = SECTIONS.includes(
      search.section as (typeof SECTIONS)[number],
    )
      ? (search.section as (typeof SECTIONS)[number])
      : 'overview'
    if (range !== 'custom') {
      return { range, section }
    }
    return {
      from:
        getDateParam(search.from) ??
        dayjs().subtract(9, 'day').format('YYYY-MM-DD'),
      range,
      section,
      to: getDateParam(search.to) ?? dayjs().format('YYYY-MM-DD'),
    }
  },
  head: () =>
    appPageHead(
      'Customer',
      'Manage a customer organization, plan, and access.',
    ),
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  const { orgId } = Route.useParams()
  return <CustomerDetail orgId={orgId} />
}
