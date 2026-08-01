import { Link, useRouterState } from '@tanstack/react-router'
import {
  ActivityIcon,
  ChartColumnIcon,
  LayoutGridIcon,
  type LucideIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { NavUser } from '@/components/app/nav-user'
import { Badge } from '@/components/ui/badge'
import type { SessionUser } from '@/functions/auth'
import { cn } from '@/lib/cn/utils'

interface NavItem {
  exact?: boolean
  icon: LucideIcon
  label: string
  selfHostOnly?: boolean
  to: string
}

const NAV: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutGridIcon, exact: true },
  { to: '/admin/customers', label: 'Customers', icon: UsersRoundIcon },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartColumnIcon },
  { to: '/admin/operations', label: 'Operations', icon: ActivityIcon },
  { to: '/admin/staff', label: 'Staff', icon: UsersIcon, selfHostOnly: true },
  { to: '/admin/settings', label: 'Settings', icon: SlidersHorizontalIcon },
]

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.to : pathname.startsWith(item.to)
}

export function activeAdminSection(pathname: string) {
  return NAV.find((item) => isActive(pathname, item))?.label ?? 'Admin'
}

// Standalone operator-console sidebar. Distinct surface (its own --sidebar tokens,
// no project switcher, no product/tenant nav) so /admin reads as a separate app
// from the tenant /app shell.
export function AdminSidebar({
  cloud,
  user,
  onNavigate,
}: {
  cloud: boolean
  user: SessionUser
  onNavigate?: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const items = NAV.filter((item) => !(item.selfHostOnly && cloud))

  return (
    <div className="flex h-full flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2 border-sidebar-border border-b px-4">
        <Link
          className="flex items-center gap-2 font-semibold text-sm"
          onClick={onNavigate}
          to="/admin"
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary/10 text-sidebar-primary">
            <ShieldIcon className="size-4" />
          </span>
          Operator console
        </Link>
        <Badge variant="success">Admin</Badge>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 font-medium text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )}
              key={item.to}
              onClick={onNavigate}
              to={item.to}
            >
              <Icon
                className={cn('size-4', active && 'text-sidebar-primary')}
              />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-sidebar-border border-t p-2">
        <NavUser admin cloud={cloud} user={user} variant="sidebar" />
      </div>
    </div>
  )
}
