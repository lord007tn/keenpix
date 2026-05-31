import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import type { CSSProperties } from 'react'
import { AppSidebar } from '@/components/app/app-sidebar'
import { AppTopbar } from '@/components/app/app-topbar'
import { RouteError } from '@/components/app/route-error'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getSessionFn } from '@/functions/auth'
import { listProjectsFn } from '@/functions/projects'
import { ProjectProvider } from '@/stores/project-context'

const sidebarStyle: CSSProperties & {
  '--header-height': string
  '--sidebar-width': string
} = {
  '--sidebar-width': 'calc(var(--spacing) * 72)',
  '--header-height': 'calc(var(--spacing) * 12)',
}

export const Route = createFileRoute('/app')({
  // The active project id is carried in ?project= across every /app page.
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
    meta: [{ name: 'robots', content: 'noindex,nofollow' }],
  }),
  component: AppLayout,
  errorComponent: RouteError,
})

function AppLayout() {
  const projects = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  return (
    <ProjectProvider projects={projects}>
      <SidebarProvider style={sidebarStyle}>
        <AppSidebar user={user} />
        <SidebarInset id="main-content">
          <AppTopbar />
          <div className="flex flex-1 flex-col overflow-auto">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProjectProvider>
  )
}
