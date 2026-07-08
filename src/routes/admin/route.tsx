import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AdminTopnav } from '@/components/app/admin-topnav'
import { AppNotFound, RouteError } from '@/components/app/error-page'
import { getSessionFn } from '@/functions/auth'
import { getPublicConfigFn } from '@/functions/config'
import { appPageHead } from '@/shared/seo'

const ADMIN_ROUTE_HEAD = appPageHead(
  'Admin',
  'Keenpix operator console — instance operations, health, clients, and CDN settings.',
)

// Standalone operator console, reached from the user dropdown (not an app tab).
// Guards super-admin here at the layout so every /admin/* child inherits it —
// defense-in-depth on top of the per-action server guards.
export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const [user, config] = await Promise.all([
      getSessionFn(),
      getPublicConfigFn(),
    ])
    if (!user) {
      throw redirect({ to: '/login' })
    }
    if (user.role !== 'super_admin') {
      throw redirect({ to: '/app' })
    }
    return { user, cloud: config.cloud }
  },
  head: () => ({
    ...ADMIN_ROUTE_HEAD,
    meta: [
      ...ADMIN_ROUTE_HEAD.meta,
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AdminLayout,
  errorComponent: RouteError,
  notFoundComponent: AppNotFound,
})

function AdminLayout() {
  const { user, cloud } = Route.useRouteContext()
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AdminTopnav cloud={cloud} user={user} />
      <main className="flex flex-1 flex-col overflow-auto" id="main-content">
        <Outlet />
      </main>
    </div>
  )
}
