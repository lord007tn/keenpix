import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { useEffect } from 'react'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { PageHeader } from '@/components/app/page-header'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { RecentActivity } from '@/components/app/recent-activity'
import { RefreshingIndicator } from '@/components/app/refreshing-indicator'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ResponseLatencyCard } from '@/features/analytics/response-latency-card'
import { DashboardBodySkeleton } from '@/features/analytics/skeletons'
import { SourceSplitCards } from '@/features/analytics/source-split-cards'
import { useDashboardQuery } from '@/features/analytics/use-dashboard-query'
import { useEdgeStats } from '@/features/analytics/use-edge-stats'
import { OnboardingChecklist } from '@/features/onboarding/onboarding-checklist'
import { QuickStart } from '@/features/onboarding/quick-start'
import { trackFunnelMilestone } from '@/lib/analytics/client'
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
  const { user, cloud, orgRole, productAccess, workspaceReady } =
    useRouteContext({ from: '/app' })
  const isSuperAdmin = user.role === 'super_admin'
  // Stale-while-revalidate: the previous payload stays on screen while a new
  // range/project loads in the background; `isRefreshing` drives the indicator.
  const { data, isPending, isFetching, isError, refetch } = useDashboardQuery(
    search,
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
  } = useEdgeStats(workspaceReady ? range : undefined)

  const header = (
    <PageHeader
      actions={
        <>
          <RefreshingIndicator
            active={isRefreshing}
            error={isError && Boolean(data)}
          />
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
  // Edge is zone-wide, so it only reconciles at all-projects scope and only over
  // a window our captured history fully covers.
  const edgeGated = edgeConfigured && edge !== null && isAll && edgeCovered
  // The edge/CDN dataset is whole-zone (aggregate across tenants). In cloud only
  // the platform operator may see it; everyone sees it self-host. When it's not
  // visible, no edge cards, notes, or connect prompt appear at all.
  const canSeeEdge = !cloud || isSuperAdmin
  // Only the operator can wire Cloudflare, so only the super-admin ever sees the
  // "connect" prompt. Regular tenants (and cloud users, who never own the zone)
  // just get the origin-only cards with no dead-end call to action.
  const edgeNotConfigured =
    isSuperAdmin && !(edgePending || edgeError || edgeConfigured)
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
      edgeNote = isSuperAdmin
        ? "Couldn't load edge data — check the CLOUDFLARE_* env vars (Admin → Settings)."
        : undefined
    } else if (isAll) {
      edgeNote =
        'Edge history is still accumulating — older data for this range isn’t available yet.'
    } else {
      edgeNote =
        'Edge is whole-zone only — switch to All projects to see the source split.'
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
        gated={edgeGated}
        note={edgeNote}
        preparing={edgePreparing}
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
