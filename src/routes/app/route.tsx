import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppTopnav } from '@/components/app/app-topnav'
import { AppNotFound, RouteError } from '@/components/app/error-page'
import { getSessionFn } from '@/functions/auth'
import { listProjectsFn } from '@/functions/projects'
import { appPageHead } from '@/shared/seo'
import { ProjectProvider } from '@/stores/project-context'

const APP_ROUTE_HEAD = appPageHead(
  'App',
  'Private Keenpix control plane for image optimization projects, analytics, logs, and settings.',
)

export const Route = createFileRoute('/app')({
  validateSearch: (search: Record<string, unknown>): { project?: string } => ({
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user }
  },
  loader: () => listProjectsFn(),
  head: () => ({
    ...APP_ROUTE_HEAD,
    meta: [
      ...APP_ROUTE_HEAD.meta,
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AppLayout,
  errorComponent: RouteError,
  notFoundComponent: AppNotFound,
})

function AppLayout() {
  const projects = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  return (
    <ProjectProvider projects={projects}>
      <div className="flex min-h-svh flex-col bg-background">
        <AppTopnav user={user} />
        <main className="flex flex-1 flex-col overflow-auto" id="main-content">
          <Outlet />
        </main>
      </div>
    </ProjectProvider>
  )
}
