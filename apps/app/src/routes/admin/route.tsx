import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import {
  AdminSidebar,
  activeAdminSection,
} from '@/components/app/admin-sidebar'
import { AppNotFound, RouteError } from '@/components/app/error-page'
import { ImpersonationBanner } from '@/components/app/impersonation-banner'
import { ModeToggle } from '@/components/theme/mode-toggle'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { getSessionFn } from '@/functions/auth'
import { getPublicConfigFn } from '@/functions/config'
import { QueryProvider } from '@/lib/tanstack-query/root-provider'
import { appPageHead } from '@/shared/seo'

const ADMIN_ROUTE_HEAD = appPageHead(
  'Admin',
  'Keenpix operator console — customers, platform analytics, operations, and settings.',
)

// Standalone operator console (/admin) — its own sidebar app, deliberately not
// sharing the tenant /app shell. Guards super-admin here at the layout so every
// /admin/* child inherits it, on top of the per-action server guards.
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const section = useRouterState({
    select: (s) => activeAdminSection(s.location.pathname),
  })

  return (
    <QueryProvider>
      <div
        className="flex min-h-svh bg-background"
        data-analytics-traffic="internal"
      >
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-sidebar-border border-r md:block">
          <AdminSidebar cloud={cloud} user={user} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-3 sm:px-4">
            <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    aria-label="Open navigation"
                    className="md:hidden"
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <MenuIcon />
              </SheetTrigger>
              <SheetContent
                className="w-64 gap-0 p-0"
                showCloseButton={false}
                side="left"
              >
                <AdminSidebar
                  cloud={cloud}
                  onNavigate={() => setMobileOpen(false)}
                  user={user}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Operator</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="font-medium">{section}</span>
            </div>
            <div className="flex-1" />
            <ModeToggle />
          </header>

          <ImpersonationBanner user={user} />
          <main
            className="flex flex-1 flex-col overflow-auto"
            id="main-content"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </QueryProvider>
  )
}
