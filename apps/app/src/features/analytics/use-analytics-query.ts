import { useQuery } from '@tanstack/react-query'
import { getAnalyticsFn } from '@/functions/analytics'
import type { HistoricalAnalyticsRange } from '@/shared/types'

// Analytics payload, fetched client-side with stale-while-revalidate.
// Range/filter changes keep this project's previous data while the new window
// loads. A project change shows the loading state until that project's data is
// available; metrics from another project must not appear under its heading.
export function useAnalyticsQuery(params: {
  country?: string[]
  domain?: string[]
  format?: string[]
  from?: string
  outcome?: string[]
  project?: string
  range: HistoricalAnalyticsRange
  status?: string[]
  to?: string
}) {
  const query = useQuery({
    queryKey: [
      'analytics',
      params.range,
      params.project,
      params.country,
      params.domain,
      params.format,
      params.from,
      params.outcome,
      params.status,
      params.to,
    ],
    queryFn: () => getAnalyticsFn({ data: params }),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === params.project ? previousData : undefined,
    staleTime: 30_000,
  })
  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  }
}
