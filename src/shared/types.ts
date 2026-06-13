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
  cached: number
  label: string
  optimized: number
  requests: number
}

export interface FormatSlice {
  color: string
  label: string
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
  bandwidthIn: number
  bandwidthOut: number
  bandwidthSaved: number
  hitRate: number
  p50: number
  p95: number
  p99: number
  savingsPct: number
  totalRequests: number
}

export interface ProjectStat {
  hitRate: number
  requests: number
}

// Cloudflare edge-cache rollup for the window, fetched from the Cloudflare
// GraphQL Analytics API. Zone-wide (all /img/* traffic), since Cloudflare does
// not know the keenpix project id. These hits are served before the origin, so
// they never appear in RequestLog.
export interface EdgeCacheStats {
  bytesFromEdge: number
  cachedRequests: number
  // ISO timestamp of when these figures were fetched from Cloudflare.
  fetchedAt: string
  hitRate: number
  requests: number
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
