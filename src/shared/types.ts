import type { OutputFormat } from './transform'

export type ProjectFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

export interface Project {
  allowedOrigins: string[]
  // Auto-negotiate raster AVIF/WebP/JPEG from Accept when fmt=auto is requested.
  autoFormat: boolean
  color1: string
  color2: string
  createdAt: string
  defaultDpr: number
  // Applied when a transform request omits ?fit= / ?dpr=.
  defaultFit: ProjectFit
  // Applied when a transform request omits ?q=.
  defaultQuality: number
  id: string
  // Optional cap on the requested width; null/0 means no maximum.
  maxWidth: number | null
  name: string
  orgId: string
  origin: string
  // When true, /img requests must carry a valid `s=` HMAC signature. The secret
  // itself is never on this shape — admins fetch it via getProjectSigningFn.
  requireSignedUrls: boolean
  // false preserves metadata such as EXIF, GPS, and ICC profiles.
  stripMetadata: boolean
}

export type AnalyticsRange = '24h' | '7d' | '30d' | '90d'

export function isAnalyticsRange(value: unknown): value is AnalyticsRange {
  return value === '24h' || value === '7d' || value === '30d' || value === '90d'
}

export interface TimePoint {
  bandwidthIn: number
  bandwidthOut: number
  bandwidthSaved: number
  cached: number
  label: string
  optimized: number
  requests: number
  successful: number
}

// One time bucket of requests split by HTTP status class, for the reliability
// chart that surfaces 4xx/5xx spikes over the window.
export interface StatusPoint {
  clientError: number
  label: string
  redirect: number
  serverError: number
  success: number
}

// A most-requested path carrying both dimensions so the Top images card can
// rank by request count or by delivered bytes without a refetch.
export interface TopImageRow {
  bytes: number
  label: string
  requests: number
}

export interface FormatSlice {
  color: string
  label: string
  // Bytes the optimizer saved on this format over the window — surfaced in the
  // donut legend as the per-format savings breakdown.
  saved: number
  value: number
}

export interface TopItem {
  icon?: string
  label: string
  sub?: string
  value: number
}

export interface LatencyBin {
  bucket: number
  label: string
  value: number
}

// Approximate latency percentiles for one time bucket, for the latency-trend
// chart (the histogram shows the whole window; this shows it moving over time).
export interface LatencyTrendPoint {
  label: string
  p50: number
  p95: number
  p99: number
}

export type LogStatus = number

export type LogFormat = OutputFormat

export function isLogFormat(value: unknown): value is LogFormat {
  return (
    value === 'avif' ||
    value === 'gif' ||
    value === 'heif' ||
    value === 'jpeg' ||
    value === 'png' ||
    value === 'svg' ||
    value === 'tiff' ||
    value === 'webp'
  )
}

export interface LogRow {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cached: boolean
  format: LogFormat
  id: string
  latency: number
  path: string
  projectId: string
  q: number
  sourceHost: string | null
  status: LogStatus
  ts: string
  w: number
}

export interface AnalyticsSummary {
  avg: number
  bandwidthIn: number
  bandwidthOut: number
  bandwidthSaved: number
  cacheHits: number
  failedRequests: number
  hitRate: number
  liveOptimizations: number
  p50: number
  p75: number
  p90: number
  p95: number
  p99: number
  savingsPct: number
  successfulDeliveries: number
  totalRequests: number
}

export interface ProjectStat {
  hitRate: number
  requests: number
}

// Requests (and bytes saved) by requester country for the geo breakdown. country
// is an ISO code, or "Unknown" when the edge didn't report one.
export interface GeoRow {
  country: string
  requests: number
  saved: number
}

// One hourly bucket of edge traffic for the edge-cache time series.
export interface EdgeCachePoint {
  // Bytes served from the Cloudflare edge in this hour.
  bytes: number
  // Requests served from the edge cache (hit/stale/revalidated/updating).
  hit: number
  // X-axis label, e.g. "14:00".
  label: string
  // Requests that missed the edge and reached keenpix.
  miss: number
}

// Cloudflare edge-cache rollup for the last 24h, fetched from the Cloudflare
// GraphQL Analytics API. Zone-wide for the configured host's /img/* traffic,
// since Cloudflare does not know the keenpix project id. These hits are served
// before the origin, so they never appear in RequestLog. The adaptive dataset
// is capped at a 1-day window on non-enterprise plans, hence the fixed 24h.
export interface EdgeCacheStats {
  // Per Cloudflare cache status (hit, miss, expired, bypass, none, ...).
  byStatus: Array<{ requests: number; status: string }>
  bytesFromEdge: number
  cachedRequests: number
  // ISO timestamp of when these figures were fetched from Cloudflare.
  fetchedAt: string
  hitRate: number
  requests: number
  // Hourly buckets across the window, oldest first.
  series: EdgeCachePoint[]
  windowHours: number
}

export interface ProjectBreakdownRow {
  avgLatency: number
  bandwidthSaved: number
  hitRate: number
  name: string
  projectId: string
  requests: number
}

export interface DomainBreakdownRow {
  avgLatency: number
  bandwidthSaved: number
  domain: string
  hitRate: number
  lastSeen: string | null
  requests: number
}

export interface AllowedHostStat {
  // false = seen in request logs but not on the project's allowlist.
  allowed: boolean
  bandwidthSaved: number
  hitRate: number
  host: string
  lastSeen: string | null
  requests: number
}

export interface KpiValue {
  // Previous-window value used by the dashboard cards to show real trends.
  prev: number
  value: number
}

export interface DashboardKpis {
  bandwidthIn: number
  bandwidthOut: number
  bandwidthSaved: KpiValue
  hitRate: KpiValue
  p95: KpiValue
  requests: KpiValue
}
