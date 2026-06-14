import {
  createFileRoute,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { PageHeader } from '@/components/app/page-header'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { RecentActivity } from '@/components/app/recent-activity'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { OperationsSummary } from '@/features/admin/operations-summary'
import { ResponseLatencyCard } from '@/features/analytics/response-latency-card'
import { SourceSplitCards } from '@/features/analytics/source-split-cards'
import { useDashboardQuery } from '@/features/analytics/use-dashboard-query'
import { useEdgeStats } from '@/features/analytics/use-edge-stats'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { appPageHead } from '@/shared/seo'
import { type AnalyticsRange, isAnalyticsRange } from '@/shared/types'
import { useProject } from '@/stores/project-context'

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '90d', label: '90 days' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
  { value: '24h', label: '24 hours' },
]

// Relative change vs the previous window; null means there is no baseline.
function relDelta(v: { prev: number; value: number }): number | null {
  if (v.prev === 0) {
    return v.value === 0 ? 0 : null
  }
  return ((v.value - v.prev) / v.prev) * 100
}

export const Route = createFileRoute('/app/dashboard/')({
  head: () =>
    appPageHead(
      'Overview',
      'Keenpix overview — edge delivery, request trends, recent activity, and instance operations at a glance.',
    ),
  validateSearch: (
    search: Record<string, unknown>,
  ): { range: AnalyticsRange; project?: string } => ({
    // 24h by default so the rollup data lines up with the 24h-only Cloudflare
    // edge stats and the source split reconciles on landing.
    range: isAnalyticsRange(search.range) ? search.range : '24h',
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  component: DashboardPage,
})

function DashboardPage() {
  const search = Route.useSearch()
  const { range } = search
  const navigate = useNavigate({ from: Route.fullPath })
  const { currentProject, isAll, setProject } = useProject()
  const { user } = useRouteContext({ from: '/app' })
  const isSuperAdmin = user.role === 'super_admin'
  // Stale-while-revalidate: the previous payload stays on screen while a new
  // range/project loads in the background; `isRefreshing` drives the indicator.
  const { data, isPending, isFetching, isError } = useDashboardQuery(search)
  const isRefreshing = isFetching && !isPending
  // Cloudflare edge stats load off the critical path; the KPI edge split fills
  // in afterward.
  const { edge, edgeConfigured, edgePending, edgeError } = useEdgeStats()

  const header = (
    <PageHeader
      actions={
        <>
          <RefreshingIndicator active={isRefreshing} />
          <ToggleGroup
            onValueChange={(v: string[]) => {
              const next = v[0]
              if (isAnalyticsRange(next)) {
                navigate({ search: (prev) => ({ ...prev, range: next }) })
              }
            }}
            size="sm"
            value={[range]}
            variant="outline"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value}>
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      }
      eyebrow={isAll ? 'All projects' : currentProject?.name}
      subtitle={
        isAll
          ? 'A bird’s-eye on every project — edge delivery, trends, activity, and instance health.'
          : `${currentProject?.name ?? 'This project'} — trends and recent activity.`
      }
      title="Overview"
    />
  )

  // First load (no cached data yet): the real header stays interactive over a
  // light loading state — no skeletons.
  if (!data) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {header}
        {isError ? (
          <p className="text-destructive text-sm">
            Couldn’t load the overview — it will retry shortly.
          </p>
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        )}
      </div>
    )
  }

  const { projects, stats, kpis, series, recentLogs, latencySummary, latency } =
    data

  // The KPI row is the same source-split cards as the analytics page, fed from
  // the dashboard's KPI payload, so the two pages always show identical numbers.
  const cardSummary = {
    bandwidthOut: kpis.bandwidthOut,
    bandwidthSaved: kpis.bandwidthSaved.value,
    totalRequests: kpis.requests.value,
    hitRate: kpis.hitRate.value,
  }
  const edgeReconcilableWindow = isAll && range === '24h'
  const edgeGated = edgeConfigured && edge !== null && edgeReconcilableWindow
  const edgeNotConfigured = !(edgePending || edgeError || edgeConfigured)
  let edgeNote: string | undefined
  if (!(edgePending || edgeGated || edgeNotConfigured)) {
    if (edgeError || !edge) {
      edgeNote =
        "Couldn't load Cloudflare edge data — check the token in Settings → CDN cache."
    } else if (isAll) {
      edgeNote =
        'Cloudflare edge is fixed to the last 24h — switch to 24h to see the source split.'
    } else {
      edgeNote =
        'Cloudflare edge is whole-zone only — switch to All projects to see the source split.'
    }
  }
  const deltas = {
    requests: relDelta(kpis.requests),
    hitRatePp: kpis.hitRate.value - kpis.hitRate.prev,
    saved: relDelta(kpis.bandwidthSaved),
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Create your first project</EmptyTitle>
            <EmptyDescription>
              A project points keenpix at one image origin. Add the source host
              to its allowlist under Settings, then request{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                /img/https://origin.example/photo.jpg?project=ID
              </code>{' '}
              — no API key required for transform URLs.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewProjectDialog />
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {header}

      <SourceSplitCards
        connect={edgeNotConfigured}
        deltas={deltas}
        edge={edge}
        gated={edgeGated}
        note={edgeNote}
        summary={cardSummary}
      />

      <ResponseLatencyCard bins={latency} summary={latencySummary} />

      <ChartAreaInteractive data={series} />

      {isAll ? (
        <ProjectsDataTable
          activeId={currentProject?.id}
          onSelect={(id) => setProject(id)}
          projects={projects}
          stats={stats}
        />
      ) : null}

      {isAll && isSuperAdmin ? (
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <RecentActivity logs={recentLogs} />
          <OperationsSummary />
        </div>
      ) : (
        <RecentActivity logs={recentLogs} />
      )}
    </div>
  )
}
