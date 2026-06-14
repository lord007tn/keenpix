import type { RollupRow } from '@/data-access/analytics-rollups'

// Group rollup rows by a derived key, preserving first-seen order (Map keeps
// insertion order) so downstream sorts stay stable. Shared by every per-key
// rollup derivation (formats, paths, countries, projects, hosts) so the page
// can fetch the window once and slice it many ways in memory.
export function groupRollups<T>(
  rows: RollupRow[],
  key: (row: RollupRow) => string,
  build: (key: string, rows: RollupRow[]) => T,
) {
  const groups = new Map<string, RollupRow[]>()
  for (const row of rows) {
    const k = key(row)
    const group = groups.get(k)
    if (group) {
      group.push(row)
    } else {
      groups.set(k, [row])
    }
  }
  return [...groups.entries()].map(([k, grouped]) => build(k, grouped))
}
