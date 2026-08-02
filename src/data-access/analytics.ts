// Filters applied to the analytics rollup queries. Domain filtering is only
// meaningful within a single project's allowlist. Shared by the aggregate query
// builders in `analytics-aggregates.ts`.
export interface AnalyticsFilters {
  country?: string[]
  domain?: string[]
  format?: string[]
  outcome?: string[]
  status?: string[]
}
