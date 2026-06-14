import { useQuery } from '@tanstack/react-query'
import { getEdgeCacheStatsFn } from '@/functions/analytics'

// Cloudflare edge stats are zone-wide and fixed to the last 24h, so they don't
// vary by range or project — one query feeds every analytics surface (the KPI
// source-split cards and the traffic chart's edge/compare lenses). Fetched
// client-side, off the loader's critical path, so a slow Cloudflare round-trip
// never blocks first paint; the server fn is itself LRU-cached for ~5 minutes,
// so the request is usually instant.
export function useEdgeStats() {
  const query = useQuery({
    queryKey: ['edge-stats'],
    queryFn: () => getEdgeCacheStatsFn(),
    staleTime: 30_000,
  })
  return {
    edge: query.data?.edge ?? null,
    edgeConfigured: query.data?.edgeConfigured ?? false,
    // Pending only on the very first load; a background refetch keeps the last
    // resolved edge data on screen rather than flashing a skeleton.
    edgePending: query.isPending,
    // The RPC itself failing (network/5xx, after the retry) leaves data
    // undefined — which must NOT read as "Cloudflare not configured", or a
    // configured user gets a false connect CTA. Callers treat this as
    // "couldn't load" and fall back to origin-only with a note.
    edgeError: query.isError,
  }
}
