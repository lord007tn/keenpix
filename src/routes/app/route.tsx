import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppTopnav } from '@/components/app/app-topnav'
import { AppNotFound, RouteError } from '@/components/app/error-page'
import { ServingBanner } from '@/components/app/serving-banner'
import { getSessionFn } from '@/functions/auth'
import { getPublicConfigFn } from '@/functions/config'
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
    const [user, config] = await Promise.all([
      getSessionFn(),
      getPublicConfigFn(),
    ])
    if (!user) {
      throw redirect({ to: '/login' })
    }
    // `cloud` lets the app shell hide self-host-only surfaces (instance SMTP/
    // Cloudflare/operations config) for cloud tenants — defense-in-depth on top
    // of the requireSelfHost server guard.
    return { user, cloud: config.cloud }
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
  const { user, cloud } = Route.useRouteContext()
  return (
    <ProjectProvider projects={projects}>
      <div className="flex min-h-svh flex-col bg-background">
        <AppTopnav cloud={cloud} user={user} />
        <ServingBanner cloud={cloud} />
        <main className="flex flex-1 flex-col overflow-auto" id="main-content">
          <Outlet />
        </main>
      </div>
    </ProjectProvider>
  )
}
