import dayjs from 'dayjs'
import { rollupBucketing } from '@/data-access/analytics-rollups'
import type {
  AnalyticsRange,
  DomainBreakdownRow,
  FormatSlice,
  GeoRow,
  LatencyBin,
  LatencyTrendPoint,
  ProjectStat,
  StatusPoint,
  TimePoint,
} from '@/shared/types'
import {
  approximateLatencyPercentile,
  emptyLatencyBucketCounts,
  LATENCY_BUCKETS,
  type LatencyBucketCounts,
} from './latency-buckets'

// Pure shapers that turn aggregated rollup rows (summed in Postgres) into the
// analytics page's series, distributions, and breakdowns. DB-free so they stay
// unit-testable; they mirror the old per-row JS reducers byte-for-byte.

// ---------------------------------------------------------------------------
// Window summary
// ---------------------------------------------------------------------------

export interface RollupSummaryAgg {
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cachedRequests: number
  latency: LatencyBucketCounts
  latencyMsSum: number
  optimizedRequests: number
  requests: number
  successfulRequests: number
}

export function summarizeAgg(agg: RollupSummaryAgg) {
  const totalRequests = agg.requests
  const bandwidthOut = agg.bytesOut
  const bandwidthSaved = agg.bytesSaved
  return {
    totalRequests,
    successfulDeliveries: agg.successfulRequests,
    liveOptimizations: agg.optimizedRequests,
    cacheHits: agg.cachedRequests,
    failedRequests: Math.max(0, totalRequests - agg.successfulRequests),
    bandwidthIn: agg.bytesIn,
    bandwidthOut,
    bandwidthSaved,
    hitRate:
      agg.successfulRequests === 0
        ? 0
        : (agg.cachedRequests / agg.successfulRequests) * 100,
    savingsPct:
      bandwidthSaved + bandwidthOut === 0
        ? 0
        : (bandwidthSaved / (bandwidthSaved + bandwidthOut)) * 100,
    avg: totalRequests === 0 ? 0 : Math.round(agg.latencyMsSum / totalRequests),
    p50: approximateLatencyPercentile(agg.latency, 0.5),
    p75: approximateLatencyPercentile(agg.latency, 0.75),
    p90: approximateLatencyPercentile(agg.latency, 0.9),
    p95: approximateLatencyPercentile(agg.latency, 0.95),
    p99: approximateLatencyPercentile(agg.latency, 0.99),
  }
}

export function latencyBinsFromAgg(agg: RollupSummaryAgg): LatencyBin[] {
  return LATENCY_BUCKETS.map((b) => ({
    bucket: b.max,
    label: b.label,
    value: agg.latency[b.field],
  }))
}

// ---------------------------------------------------------------------------
// Per-time-bucket series (requests + latency trend share one query)
// ---------------------------------------------------------------------------

export interface BucketAgg {
  bucketStart: Date
  bytesIn: number
  bytesOut: number
  bytesSaved: number
  cachedRequests: number
  latency: LatencyBucketCounts
  optimizedRequests: number
  requests: number
}

export function timeSeriesFromBuckets(
  buckets: BucketAgg[],
  range: AnalyticsRange,
): TimePoint[] {
  const { n, labelFor, indexFor } = rollupBucketing(range)
  const out: TimePoint[] = Array.from({ length: n }, (_, i) => ({
    label: labelFor(i),
    requests: 0,
    cached: 0,
    optimized: 0,
    successful: 0,
    bandwidthIn: 0,
    bandwidthOut: 0,
    bandwidthSaved: 0,
  }))
  for (const b of buckets) {
    const bucket = out[indexFor(b.bucketStart)]
    bucket.requests += b.requests
    bucket.cached += b.cachedRequests
    bucket.optimized += b.optimizedRequests
    bucket.successful += b.cachedRequests + b.optimizedRequests
    bucket.bandwidthIn += b.bytesIn
    bucket.bandwidthOut += b.bytesOut
    bucket.bandwidthSaved += b.bytesSaved
  }
  return out
}

export function latencyTrendFromBuckets(
  buckets: BucketAgg[],
  range: AnalyticsRange,
): LatencyTrendPoint[] {
  const { n, labelFor, indexFor } = rollupBucketing(range)
  const counts = Array.from({ length: n }, () => emptyLatencyBucketCounts())
  for (const b of buckets) {
    const c = counts[indexFor(b.bucketStart)]
    for (const lb of LATENCY_BUCKETS) {
      c[lb.field] += b.latency[lb.field]
    }
  }
  return counts.map((c, i) => ({
    label: labelFor(i),
    p50: approximateLatencyPercentile(c, 0.5),
    p95: approximateLatencyPercentile(c, 0.95),
    p99: approximateLatencyPercentile(c, 0.99),
  }))
}

// ---------------------------------------------------------------------------
// Status series (per time bucket × status class)
// ---------------------------------------------------------------------------

export interface BucketStatusAgg {
  bucketStart: Date
  requests: number
  status: number
}

export function statusSeriesFromBuckets(
  rows: BucketStatusAgg[],
  range: AnalyticsRange,
): StatusPoint[] {
  const { n, labelFor, indexFor } = rollupBucketing(range)
  const out: StatusPoint[] = Array.from({ length: n }, (_, i) => ({
    label: labelFor(i),
    success: 0,
    redirect: 0,
    clientError: 0,
    serverError: 0,
  }))
  for (const r of rows) {
    const bucket = out[indexFor(r.bucketStart)]
    const cls = Math.floor(r.status / 100)
    if (cls === 2) {
      bucket.success += r.requests
    } else if (cls === 3) {
      bucket.redirect += r.requests
    } else if (cls === 4) {
      bucket.clientError += r.requests
    } else if (cls === 5) {
      bucket.serverError += r.requests
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Format distribution
// ---------------------------------------------------------------------------

const FORMAT_COLORS: Record<string, string> = {
  avif: 'var(--chart-1)',
  webp: 'var(--chart-2)',
  jpeg: 'var(--chart-4)',
  png: 'var(--chart-3)',
  gif: 'var(--muted-foreground)',
  heif: 'var(--chart-5)',
  svg: 'var(--accent-foreground)',
  tiff: 'var(--secondary-foreground)',
}

export interface FormatAgg {
  format: string
  requests: number
  saved: number
}

export function formatDistribution(rows: FormatAgg[]): FormatSlice[] {
  const total = rows.reduce((sum, r) => sum + r.requests, 0) || 1
  return rows
    .map((g) => ({
      label: g.format.toUpperCase(),
      value: Math.round((g.requests / total) * 1000) / 10,
      saved: g.saved,
      color: FORMAT_COLORS[g.format] ?? 'var(--muted-foreground)',
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
}

// ---------------------------------------------------------------------------
// Geo distribution ("" → "Unknown", top 12)
// ---------------------------------------------------------------------------

export interface CountryAgg {
  country: string
  requests: number
  saved: number
}

export function geoDistribution(rows: CountryAgg[]): GeoRow[] {
  return rows
    .map((r) => ({
      country: r.country || 'Unknown',
      requests: r.requests,
      saved: r.saved,
    }))
    .sort(
      (a, b) => b.requests - a.requests || a.country.localeCompare(b.country),
    )
    .slice(0, 12)
}

// ---------------------------------------------------------------------------
// Per-project + per-host breakdowns
// ---------------------------------------------------------------------------

export interface ProjectAgg {
  bytesSaved: number
  cachedRequests: number
  latencyMsSum: number
  optimizedRequests: number
  projectId: string
  requests: number
}

export function projectStats(rows: ProjectAgg[]) {
  const out: Record<string, ProjectStat> = {}
  for (const r of rows) {
    out[r.projectId] = {
      requests: r.requests,
      hitRate:
        r.cachedRequests + r.optimizedRequests === 0
          ? 0
          : (r.cachedRequests / (r.cachedRequests + r.optimizedRequests)) * 100,
    }
  }
  return out
}

export function projectBreakdown(
  rows: ProjectAgg[],
  nameById: Map<string, string>,
) {
  return rows
    .map((r) => ({
      projectId: r.projectId,
      name: nameById.get(r.projectId) ?? r.projectId,
      requests: r.requests,
      bandwidthSaved: r.bytesSaved,
      hitRate:
        r.cachedRequests + r.optimizedRequests === 0
          ? 0
          : (r.cachedRequests / (r.cachedRequests + r.optimizedRequests)) * 100,
      avgLatency:
        r.requests === 0 ? 0 : Math.round(r.latencyMsSum / r.requests),
    }))
    .sort((a, b) => b.requests - a.requests || a.name.localeCompare(b.name))
}

export interface HostAgg {
  bytesSaved: number
  cachedRequests: number
  lastSeen: Date | null
  latencyMsSum: number
  optimizedRequests: number
  requests: number
  sourceHost: string
}

export function domainBreakdown(rows: HostAgg[]): DomainBreakdownRow[] {
  return rows
    .filter((r) => r.sourceHost)
    .map((r) => ({
      domain: r.sourceHost,
      requests: r.requests,
      bandwidthSaved: r.bytesSaved,
      hitRate:
        r.cachedRequests + r.optimizedRequests === 0
          ? 0
          : (r.cachedRequests / (r.cachedRequests + r.optimizedRequests)) * 100,
      avgLatency:
        r.requests === 0 ? 0 : Math.round(r.latencyMsSum / r.requests),
      lastSeen: r.lastSeen ? dayjs(r.lastSeen).format('MMM D, HH:mm') : null,
    }))
    .sort((a, b) => b.requests - a.requests || a.domain.localeCompare(b.domain))
}

export interface HostTraffic {
  bandwidthSaved: number
  hitRate: number
  lastSeen: string | null
  requests: number
}

export function hostTraffic(rows: HostAgg[]) {
  const map = new Map<string, HostTraffic>()
  for (const r of rows) {
    if (!r.sourceHost) {
      continue
    }
    map.set(r.sourceHost, {
      requests: r.requests,
      hitRate:
        r.cachedRequests + r.optimizedRequests === 0
          ? 0
          : (r.cachedRequests / (r.cachedRequests + r.optimizedRequests)) * 100,
      bandwidthSaved: r.bytesSaved,
      lastSeen: r.lastSeen ? dayjs(r.lastSeen).format('MMM D, HH:mm') : null,
    })
  }
  return map
}
