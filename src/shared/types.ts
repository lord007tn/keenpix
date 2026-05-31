/** Domain types shared across data-access, functions, and UI. */

export type ProjectEnv = 'production' | 'staging' | 'development'

export function isProjectEnv(value: unknown): value is ProjectEnv {
  return (
    value === 'production' || value === 'staging' || value === 'development'
  )
}

export interface Project {
  allowedOrigins: string[]
  /** Auto-negotiate AVIF/WebP from the Accept header for fmt=auto requests. */
  autoFormat: boolean
  /** gradient stops for the project card header */
  color1: string
  color2: string
  createdAt: string
  /** Quality (30–100) applied when a request omits ?q=. */
  defaultQuality: number
  env: ProjectEnv
  id: string
  name: string
  orgId: string
  origin: string
  /** Strip EXIF/GPS/color profiles from output. */
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
  /** css var token, e.g. 'var(--chart-1)' */
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

/** Any HTTP status the transform endpoint can log (200/400/403/404/413/5xx). */
export type LogStatus = number

export type LogFormat = 'avif' | 'webp' | 'jpeg' | 'png'

export function isLogFormat(value: unknown): value is LogFormat {
  return (
    value === 'avif' || value === 'webp' || value === 'jpeg' || value === 'png'
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

/** Per-project 24h rollup for the dashboard cards. */
export interface ProjectStat {
  hitRate: number
  requests: number
}

/** Per-project rollup for the "All projects" analytics breakdown. */
export interface ProjectBreakdownRow {
  bandwidthSaved: number
  hitRate: number
  name: string
  projectId: string
  requests: number
}

/** A KPI value with its previous-window value, so the UI can show a real trend. */
export interface KpiValue {
  prev: number
  value: number
}

/** The four dashboard KPI cards (current window + previous window for trends). */
export interface DashboardKpis {
  bandwidthSaved: KpiValue
  hitRate: KpiValue
  p95: KpiValue
  requests: KpiValue
}
