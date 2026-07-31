import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getDashboardFn } from '@/functions/dashboard'
import type { HistorySearch } from '@/helpers/history/window'

// Overview payload, fetched client-side with stale-while-revalidate (see
// use-analytics-query for the shared rationale).
export function useDashboardQuery(
  params: HistorySearch & {
    project?: string
  },
  enabled = true,
) {
  const query = useQuery({
    queryKey: [
      'dashboard',
      params.range,
      params.from,
      params.to,
      params.project,
    ],
    queryFn: () => getDashboardFn({ data: params }),
    enabled,
    placeholderData: keepPreviousData,
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
