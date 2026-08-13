import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { HistoryRangePicker } from '@/components/app/history-range-picker'
import { PageHeader } from '@/components/app/page-header'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { RecentActivity } from '@/components/app/recent-activity'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { Button } from '@/components/ui/button'
import { ResponseLatencyCard } from '@/features/analytics/response-latency-card'
import { DashboardBodySkeleton } from '@/features/analytics/skeletons'
import { SourceSplitCards } from '@/features/analytics/source-split-cards'
import { useDashboardQuery } from '@/features/analytics/use-dashboard-query'
import { useEdgeStats } from '@/features/analytics/use-edge-stats'
import { OnboardingChecklist } from '@/features/onboarding/onboarding-checklist'
import { QuickStart } from '@/features/onboarding/quick-start'
import { getBillingStateFn } from '@/functions/billing'
import { limitHistorySearch } from '@/helpers/history/window'
import { trackFunnelMilestone } from '@/lib/analytics/client'
import { DEFAULT_HISTORY_DAYS, getPlan } from '@/lib/billing/plans'
import { appPageHead } from '@/shared/seo'
import {
  type HistoricalAnalyticsRange,
  isHistoricalAnalyticsRange,
} from '@/shared/types'
import { useProject } from '@/stores/project-context'

// Relative change vs the previous window; null means there is no baseline.
function relDelta(v: { prev: number; value: number }): number | null {
  if (v.prev === 0) {
    return v.value === 0 ? 0 : null
  }
  return ((v.value - v.prev) / v.prev) * 100
}

export const Route = createFileRoute('/app/dashboard/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    from?: string
    project?: string
    range: HistoricalAnalyticsRange
    to?: string
  } => ({
    from: typeof search.from === 'string' ? search.from : undefined,
    range: isHistoricalAnalyticsRange(search.range) ? search.range : '24h',
    project: typeof search.project === 'string' ? search.project : undefined,
    to: typeof search.to === 'string' ? search.to : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (context.cloud && !context.workspaceReady) {
      throw redirect({ to: '/app/onboarding' })
    }
  },
  head: () =>
    appPageHead(
      'Overview',
      'Keenpix overview — edge delivery, request trends, recent activity, and instance operations at a glance.',
    ),
  component: DashboardPage,
})

function DashboardPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { currentProject, isAll, setProject } = useProject()
  const { user, cloud, orgRole, productAccess, workspaceReady } =
    useRouteContext({ from: '/app' })
  const isSuperAdmin = user.role === 'super_admin'
  // The delivery Worker writes a trusted project id for every request, so Edge
  // analytics are safe at both organization and individual-project scope.
  const canSeeEdge = true
  const { data: billing } = useQuery({
    enabled: cloud,
    queryFn: () => getBillingStateFn(),
    queryKey: ['billing-state'],
    staleTime: 30_000,
  })
  const maxHistoryDays = cloud
    ? (getPlan(billing?.plan)?.historyDays ?? DEFAULT_HISTORY_DAYS)
    : 3650
  const boundedWindow = limitHistorySearch(
    search,
    cloud ? maxHistoryDays : undefined,
  )
  const dashboardSearch = { ...search, ...boundedWindow }
  // Stale-while-revalidate: the previous payload stays on screen while a new
  // range/project loads in the background; `isRefreshing` drives the indicator.
  const { data, isPending, isFetching, isError, refetch } = useDashboardQuery(
    dashboardSearch,
    workspaceReady,
  )
  const requestCount = data?.latencySummary.successfulDeliveries ?? 0
  useEffect(() => {
    if (requestCount > 0) {
      trackFunnelMilestone('first_image_served')
    }
  }, [requestCount])
  const isRefreshing = isFetching && !isPending
  // Cloudflare edge stats load off the critical path; the KPI edge split fills
  // in afterward. Range-aware now that we persist edge history.
  const {
    edge,
    edgeConfigured,
    edgeCovered,
    edgeRefreshing,
    edgePending,
    edgeError,
  } = useEdgeStats(
    workspaceReady ? { ...boundedWindow, project: search.project } : undefined,
  )

  let overviewSubtitle = `${currentProject?.name ?? 'This project'} — trends and recent activity.`
  if (isAll) {
    overviewSubtitle = canSeeEdge
      ? 'A bird’s-eye on every project — edge delivery, trends, activity, and instance health.'
      : 'A bird’s-eye on every project — origin delivery, trends, and activity.'
  }

  const header = (
    <PageHeader
      actions={
        <>
          <RefreshingIndicator
            active={isRefreshing}
            error={isError && Boolean(data)}
          />
          <HistoryRangePicker
            billingPeriodStart={billing?.usage.periodStart}
            from={boundedWindow.from}
            label="Overview"
            maxDays={maxHistoryDays}
            onChange={(next) =>
              navigate({ search: (previous) => ({ ...previous, ...next }) })
            }
            range={boundedWindow.range}
            to={boundedWindow.to}
          />
        </>
      }
      eyebrow={isAll ? 'All projects' : currentProject?.name}
      subtitle={overviewSubtitle}
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
          <div className="flex flex-col items-start gap-3">
            <p className="text-destructive text-sm">
              Couldn’t load the overview.
            </p>
            <Button onClick={() => refetch()} size="sm" variant="outline">
              Try again
            </Button>
          </div>
        ) : (
          <DashboardBodySkeleton />
        )}
      </div>
    )
  }

  const { projects, stats, kpis, series, recentLogs, latencySummary, latency } =
    data

  // The KPI row is the same source-split cards as the analytics page, fed from
  // the dashboard's KPI payload, so the two pages always show identical numbers.
  const cardSummary = {
    ...latencySummary,
    bandwidthOut: kpis.bandwidthOut,
    bandwidthSaved: kpis.bandwidthSaved.value,
    totalRequests: kpis.requests.value,
    hitRate: kpis.hitRate.value,
  }
  const edgeGated = edgeConfigured && edge !== null && edgeCovered
  const edgeReady = edgeConfigured && edge !== null
  // Only the operator can wire Cloudflare, so only the super-admin ever sees the
  // "connect" prompt on a single-tenant self-hosted instance.
  const edgeNotConfigured =
    canSeeEdge &&
    (isSuperAdmin || Boolean(user.impersonatedBy)) &&
    !(edgePending || edgeError || edgeConfigured)
  // A background capture is in flight and the reconciled split isn't on screen
  // yet — show the "preparing" indicator (and hold the note) until it lands.
  const edgePreparing = edgeRefreshing && !edgeGated
  let edgeNote: string | undefined
  if (
    canSeeEdge &&
    !(edgePending || edgePreparing || edgeGated || edgeNotConfigured)
  ) {
    if (edgeError || !edge) {
      // Only the operator can act on a missing/broken token.
      edgeNote =
        isSuperAdmin || user.impersonatedBy
          ? "Couldn't load edge data — check the CLOUDFLARE_* env vars (Admin → Settings)."
          : undefined
    } else {
      edgeNote =
        'Cloudflare edge history is incomplete for this range; available edge deliveries are included in the totals.'
    }
  }
  const deltas = {
    requests: relDelta(kpis.requests),
    hitRatePp: kpis.hitRate.value - kpis.hitRate.prev,
    saved: relDelta(kpis.bandwidthSaved),
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <OnboardingChecklist
          cloud={cloud}
          entitled={productAccess}
          hasProjects={false}
          orgRole={orgRole}
        />
      </div>
    )
  }

  // A project exists but no traffic has landed yet — the new user needs to be
  // shown how to actually call keenpix (with their real project id), not left
  // staring at an all-zero dashboard.
  const quickStartProject = currentProject ?? projects[0]

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {header}

      {quickStartProject && kpis.requests.value === 0 ? (
        <QuickStart project={quickStartProject} />
      ) : null}

      <SourceSplitCards
        connect={edgeNotConfigured}
        deltas={deltas}
        edge={edge}
        note={edgeNote}
        preparing={edgePreparing}
        ready={edgeReady}
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

      {/* Operator/instance health lives in the Admin console (/admin) only,
          not on the tenant dashboard. */}
      <RecentActivity logs={recentLogs} />
    </div>
  )
}
