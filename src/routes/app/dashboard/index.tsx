import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { SectionCards } from '@/components/app/section-cards'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { getDashboardFn } from '@/functions/dashboard'
import { type AnalyticsRange, isAnalyticsRange } from '@/shared/types'
import { useProject } from '@/stores/project-context'

export const Route = createFileRoute('/app/dashboard/')({
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
  const { currentProject, setProject } = useProject()

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
              — no API keys.
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
      <SectionCards kpis={kpis} />
      <ChartAreaInteractive
        data={series}
        onRangeChange={(r) =>
          navigate({ search: (prev) => ({ ...prev, range: r }) })
        }
        range={range}
      />
      <ProjectsDataTable
        activeId={currentProject?.id}
        onSelect={(id) => setProject(id)}
        projects={projects}
        stats={stats}
      />
    </div>
  )
}
