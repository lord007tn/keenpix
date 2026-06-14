import type { RollupRow } from '@/data-access/analytics-rollups'
import type { FormatSlice, GeoRow, TopImageRow } from '@/shared/types'
import { groupRollups } from './group-rollups'

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

export function formatDistribution(rows: RollupRow[]): FormatSlice[] {
  const grouped = groupRollups(
    rows,
    (row) => row.format,
    (format, groupedRows) => ({
      format,
      requests: groupedRows.reduce((sum, row) => sum + row.requests, 0),
      saved: groupedRows.reduce((sum, row) => sum + Number(row.bytesSaved), 0),
    }),
  )
  const total = grouped.reduce((sum, row) => sum + row.requests, 0) || 1
  return grouped
    .map((g) => ({
      label: g.format.toUpperCase(),
      value: Math.round((g.requests / total) * 1000) / 10,
      saved: g.saved,
      color: FORMAT_COLORS[g.format] ?? 'var(--muted-foreground)',
    }))
    .sort((a, b) => b.value - a.value)
}

// Most-requested paths carrying both request count and delivered bytes, so the
// card can rank by either. Capped wider than the 8 shown so re-sorting by bytes
// still surfaces the real heavy hitters.
export function topImages(rows: RollupRow[]): TopImageRow[] {
  return groupRollups(
    rows,
    (row) => row.path,
    (path, groupedRows) => ({
      label: path,
      requests: groupedRows.reduce((sum, row) => sum + row.requests, 0),
      bytes: groupedRows.reduce((sum, row) => sum + Number(row.bytesOut), 0),
    }),
  )
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 20)
}

// Requests by requester country. Empty country (no edge header) folds into a
// single "Unknown" row rather than being dropped.
export function geoDistribution(rows: RollupRow[]): GeoRow[] {
  return groupRollups(
    rows,
    (row) => row.country,
    (country, groupedRows) => ({
      country: country || 'Unknown',
      requests: groupedRows.reduce((sum, row) => sum + row.requests, 0),
      saved: groupedRows.reduce((sum, row) => sum + Number(row.bytesSaved), 0),
    }),
  )
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 12)
}

// Distinct formats and statuses that actually have data in the window. Derived
// from the UNFILTERED window rows so the filter menus always offer every value
// present (the way Live Logs derives its options from data), rather than a fixed
// list that can include empty values or feel unhelpful.
export function availableFilters(rows: RollupRow[]) {
  return {
    formats: [...new Set(rows.map((r) => r.format))].sort(),
    statuses: [...new Set(rows.map((r) => r.status))].sort((a, b) => a - b),
    // Source domains actually observed in the window (incl. subdomains), so the
    // filter options match how origins are stored rather than the bare allowlist.
    domains: [...new Set(rows.map((r) => r.sourceHost))].filter(Boolean).sort(),
  }
}
