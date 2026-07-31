import { useQuery } from '@tanstack/react-query'
import { getEdgeCacheStatsFn } from '@/functions/analytics'
import type { HistorySearch } from '@/helpers/history/window'

// Cloudflare edge stats for the selected range, reconstructed from our persisted
// rollups. Fetched client-side, off the loader's critical path, so a slow remote
// call never blocks first paint. `edgeCovered` is false when the window reaches
// before our captured history, so the cards stay origin-only rather than
// reconciling misleading totals.
export function useEdgeStats(search?: HistorySearch) {
  const query = useQuery({
    queryKey: ['edge-stats', search?.range, search?.from, search?.to],
    queryFn: () => getEdgeCacheStatsFn({ data: search ?? { range: '24h' } }),
    enabled: Boolean(search),
    staleTime: 30_000,
    // The first read kicks off a background capture of fresh Cloudflare rollups;
    // poll while it's in flight so the edge split streams in on its own rather
    // than waiting for a manual reload. Stops once a response clears the flag.
    refetchInterval: (q) => (q.state.data?.edgeRefreshing ? 3000 : false),
  })
  return {
    edge: query.data?.edge ?? null,
    edgeConfigured: query.data?.edgeConfigured ?? false,
    edgeCovered: query.data?.edgeCovered ?? false,
    edgeFailure: query.data?.edgeError ?? null,
    edgeLastSuccessAt: query.data?.edgeLastSuccessAt ?? null,
    edgeRefreshing: query.data?.edgeRefreshing ?? false,
    edgeStatus: query.data?.edgeStatus ?? 'unconfigured',
    edgePending: query.isPending,
    edgeError: query.isError,
  }
}
