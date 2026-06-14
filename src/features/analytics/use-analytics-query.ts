import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAnalyticsFn } from '@/functions/analytics'
import type { AnalyticsRange } from '@/shared/types'

// Analytics payload, fetched client-side with stale-while-revalidate: a
// range/project/filter change keeps the previous data on screen (keepPreviousData)
// while the new window loads in the background. `isPending` is true only on the
// very first load with no cached data; `isFetching` covers background refetches.
export function useAnalyticsQuery(params: {
  domain?: string[]
  format?: string[]
  project?: string
  range: AnalyticsRange
  status?: string[]
}) {
  const query = useQuery({
    queryKey: [
      'analytics',
      params.range,
      params.project,
      params.domain,
      params.format,
      params.status,
    ],
    queryFn: () => getAnalyticsFn({ data: params }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}
