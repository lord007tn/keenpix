export type ProjectEnv = 'production' | 'staging' | 'development'

export function isProjectEnv(value: unknown): value is ProjectEnv {
  return (
    value === 'production' || value === 'staging' || value === 'development'
  )
}

export interface Project {
  allowedOrigins: string[]
  // Auto-negotiate AVIF/WebP from Accept when fmt=auto is requested.
  autoFormat: boolean
  color1: string
  color2: string
  createdAt: string
  // Applied when a transform request omits ?q=.
  defaultQuality: number
  env: ProjectEnv
  id: string
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

export interface ProjectBreakdownRow {
  bandwidthSaved: number
  hitRate: number
  name: string
  projectId: string
  requests: number
}

export interface DomainBreakdownRow {
  bandwidthSaved: number
  domain: string
  hitRate: number
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
