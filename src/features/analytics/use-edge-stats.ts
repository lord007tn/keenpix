import { useQuery } from '@tanstack/react-query'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import type { AnalyticsRange } from '@/shared/types'

// Cloudflare edge stats for the selected range, reconstructed from our persisted
// rollups. Fetched client-side, off the loader's critical path, so a slow remote
// call never blocks first paint. `edgeCovered` is false when the window reaches
// before our captured history, so the cards stay origin-only rather than
// reconciling misleading totals.
export function useEdgeStats(range: AnalyticsRange) {
  const query = useQuery({
    queryKey: ['edge-stats', range],
    queryFn: () => getEdgeCacheStatsFn({ data: { range } }),
    staleTime: 30_000,
  })
  return {
    edge: query.data?.edge ?? null,
    edgeConfigured: query.data?.edgeConfigured ?? false,
    edgeCovered: query.data?.edgeCovered ?? false,
    edgePending: query.isPending,
    edgeError: query.isError,
  }
}
