import dayjs, { type Dayjs } from 'dayjs'
import {
  type RollupRow,
  summarizeRollups,
} from '@/data-access/analytics-rollups'
import type { DomainBreakdownRow, ProjectStat } from '@/shared/types'
import { groupRollups } from './group-rollups'

// Per-project request/cache stats keyed by project id, for the all-projects
// comparison table.
export function projectStats(rows: RollupRow[]) {
  const out: Record<string, ProjectStat> = {}
  for (const row of groupRollups(
    rows,
    (r) => r.projectId,
    (projectId, groupedRows) => ({
      projectId,
      requests: groupedRows.reduce((sum, r) => sum + r.requests, 0),
      cached: groupedRows.reduce((sum, r) => sum + r.cachedRequests, 0),
    }),
  )) {
    out[row.projectId] = {
      requests: row.requests,
      hitRate: row.requests === 0 ? 0 : (row.cached / row.requests) * 100,
    }
  }
  return out
}

// Per-project rollup for the org-wide analytics breakdown. Names are resolved by
// the caller (data-access stays out of helpers) and passed in.
export function projectBreakdown(
  rows: RollupRow[],
  nameById: Map<string, string>,
) {
  return groupRollups(
    rows,
    (row) => row.projectId,
    (projectId, groupedRows) => {
      const summary = summarizeRollups(groupedRows)
      return {
        projectId,
        name: nameById.get(projectId) ?? projectId,
        requests: summary.totalRequests,
        bandwidthSaved: summary.bandwidthSaved,
        hitRate: summary.hitRate,
        avgLatency: summary.avg,
      }
    },
  ).sort((a, b) => b.requests - a.requests)
}

// Per-source-domain rollup for a single project's analytics. Only the project's
// own traffic is grouped; rows with no captured host are dropped.
export function domainBreakdown(rows: RollupRow[]) {
  return groupRollups(
    rows,
    (row) => row.sourceHost,
    (domain, groupedRows) => {
      if (!domain) {
        return null
      }
      const summary = summarizeRollups(groupedRows)
      const lastSeen = groupedRows.reduce<Dayjs | null>((latest, row) => {
        const next = dayjs(row.bucketStart)
        return !latest || next.isAfter(latest) ? next : latest
      }, null)
      return {
        domain,
        requests: summary.totalRequests,
        bandwidthSaved: summary.bandwidthSaved,
        hitRate: summary.hitRate,
        avgLatency: summary.avg,
        lastSeen: lastSeen ? lastSeen.format('MMM D, HH:mm') : null,
      }
    },
  )
    .filter((r): r is DomainBreakdownRow => r !== null)
    .sort((a, b) => b.requests - a.requests)
}

interface HostTraffic {
  bandwidthSaved: number
  hitRate: number
  lastSeen: string | null
  requests: number
}

// Per-source-host traffic for one project + window, keyed by host. The action
// layer joins this with the project's allowlist to build the allowed-hosts table
// (hosts seen here that are not on the list surface as "not allowed").
export function hostTraffic(rows: RollupRow[]) {
  const map = new Map<string, HostTraffic>()
  for (const row of groupRollups(
    rows,
    (r) => r.sourceHost,
    (host, groupedRows) => ({ host, groupedRows }),
  )) {
    if (!row.host) {
      continue
    }
    const summary = summarizeRollups(row.groupedRows)
    const lastSeen = row.groupedRows.reduce<Dayjs | null>((latest, r) => {
      const next = dayjs(r.bucketStart)
      return !latest || next.isAfter(latest) ? next : latest
    }, null)
    map.set(row.host, {
      requests: summary.totalRequests,
      hitRate: summary.hitRate,
      bandwidthSaved: summary.bandwidthSaved,
      lastSeen: lastSeen ? lastSeen.format('MMM D, HH:mm') : null,
    })
  }
  return map
}
