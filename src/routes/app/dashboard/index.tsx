import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChartAreaInteractive } from '@/components/app/chart-area-interactive'
import { ProjectsDataTable } from '@/components/app/projects-data-table'
import { SectionCards } from '@/components/app/section-cards'
import { Card, CardContent } from '@/components/ui/card'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { getDashboardFn } from '@/functions/dashboard'
import type { AnalyticsRange } from '@/shared/types'
import { useProject } from '@/stores/project-context'

const RANGES: AnalyticsRange[] = ['24h', '7d', '30d', '90d']

export const Route = createFileRoute('/app/dashboard/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { range: AnalyticsRange; project?: string } => ({
    range:
      typeof search.range === 'string' &&
      RANGES.includes(search.range as AnalyticsRange)
        ? (search.range as AnalyticsRange)
        : '30d',
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
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="font-semibold text-lg">
              Create your first project
            </div>
            <p className="max-w-md text-muted-foreground text-sm">
              A project points keenpix at one image origin. Add the source host
              to its allowlist under Settings, then request{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                /api/keenpix?project=ID&amp;url=…
              </code>{' '}
              — no API keys.
            </p>
            <NewProjectDialog />
          </CardContent>
        </Card>
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
