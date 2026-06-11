import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { PageHeader } from '@/components/app/page-header'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { SectionCards } from '@/components/app/section-cards'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { getDashboardFn } from '@/functions/dashboard'
import { appPageHead } from '@/lib/seo'
import { type AnalyticsRange, isAnalyticsRange } from '@/shared/types'
import { useProject } from '@/stores/project-context'

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '90d', label: '90 days' },
  { value: '30d', label: '30 days' },
  { value: '7d', label: '7 days' },
  { value: '24h', label: '24 hours' },
]

export const Route = createFileRoute('/app/dashboard/')({
  head: () =>
    appPageHead(
      'Dashboard',
      'Keenpix dashboard for project health, request trends, cache performance, and image optimization activity.',
    ),
  validateSearch: (
    search: Record<string, unknown>,
  ): { range: AnalyticsRange; project?: string } => ({
    range: isAnalyticsRange(search.range) ? search.range : '30d',
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  loaderDeps: ({ search }) => ({
    range: search.range,
    project: search.project,
  }),
  loader: ({ deps }) =>
    getDashboardFn({ data: { range: deps.range, project: deps.project } }),
  component: DashboardPage,
})

function DashboardPage() {
  const { projects, stats, kpis, series } = Route.useLoaderData()
  const { range } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { currentProject, isAll, setProject } = useProject()

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
      <PageHeader
        actions={
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
        }
        eyebrow={isAll ? 'All projects' : currentProject?.name}
        subtitle="Project health, request trends, and cache performance."
        title="Dashboard"
      />
      <SectionCards kpis={kpis} />
      <ChartAreaInteractive data={series} />
      {isAll ? (
        <ProjectsDataTable
          activeId={currentProject?.id}
          onSelect={(id) => setProject(id)}
          projects={projects}
          stats={stats}
        />
      ) : null}
    </div>
  )
}
