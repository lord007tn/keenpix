import type { EdgeCachePoint, TimePoint } from '@/shared/types'

export interface FunnelPoint {
  diskServed: number
  // Origin cache hits as a % of all client requests (cache-view band).
  diskShare: number
  edgeBytes: number
  edgeServed: number
  // edge hits as a % of all client requests (cache-view band). edgeShare +
  // diskShare = the end-to-end cache hit rate for the hour.
  edgeShare: number
  label: string
  liveProcessed: number
  originBytes: number
}

// Merge the origin time-series with the Cloudflare edge series by bucket label so
// one chart can show the whole funnel: served at the edge, then served from the
// origin cache, then freshly optimized responses. Edge hits never reach Keenpix, so the
// three bands describe the captured delivery stages for each aligned bucket.
export function mergeFunnel(
  origin: TimePoint[],
  edge: EdgeCachePoint[],
): FunnelPoint[] {
  const edgeByLabel = new Map(edge.map((e) => [e.label, e]))
  return origin.map((o) => {
    const e = edgeByLabel.get(o.label)
    const edgeServed = e?.hit ?? 0
    const total = edgeServed + o.requests
    return {
      label: o.label,
      edgeServed,
      diskServed: o.cached,
      liveProcessed: o.optimized,
      edgeBytes: e?.bytes ?? 0,
      originBytes: o.bandwidthOut,
      edgeShare: total === 0 ? 0 : (edgeServed / total) * 100,
      diskShare: total === 0 ? 0 : (o.cached / total) * 100,
    }
  })
}

// Cloudflare and keenpix as two independent series per hour, for a side-by-side
// (overlaid, not stacked) comparison chart: edge vs origin request counts,
// bytes delivered, and — most usefully — their two cache hit rates overlapped.
export interface ComparePoint {
  cfBytes: number
  cfHitRate: number
  cfRequests: number
  kpBytes: number
  kpHitRate: number
  kpRequests: number
  label: string
}

export function mergeSourceCompare(
  origin: TimePoint[],
  edge: EdgeCachePoint[],
): ComparePoint[] {
  const edgeByLabel = new Map(edge.map((e) => [e.label, e]))
  return origin.map((o) => {
    const e = edgeByLabel.get(o.label)
    const edgeHit = e?.hit ?? 0
    const edgeMiss = e?.miss ?? 0
    const edgeTotal = edgeHit + edgeMiss
    return {
      label: o.label,
      cfRequests: edgeTotal,
      kpRequests: o.requests,
      cfBytes: e?.bytes ?? 0,
      kpBytes: o.bandwidthOut,
      cfHitRate: edgeTotal === 0 ? 0 : (edgeHit / edgeTotal) * 100,
      kpHitRate: o.requests === 0 ? 0 : (o.cached / o.requests) * 100,
    }
  })
}
