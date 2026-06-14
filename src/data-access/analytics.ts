// Filters applied to the analytics rollup queries. Domain filtering is only
// meaningful within a single project's allowlist. Shared by the aggregate query
// builders in `analytics-aggregates.ts`.
export interface AnalyticsFilters {
  domain?: string[]
  format?: string[]
  status?: string[]
}
