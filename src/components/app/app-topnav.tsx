import { Link, useRouterState } from '@tanstack/react-router'
import {
  ActivityIcon,
  ChartColumnIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  SettingsIcon,
} from 'lucide-react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { NavUser } from '@/components/app/nav-user'
import { ProjectSwitcher } from '@/components/app/project-switcher'
import { ModeToggle } from '@/components/theme/mode-toggle'
import type { SessionUser } from '@/functions/auth'
import { cn } from '@/lib/cn/utils'
import { useProject } from '@/stores/project-context'

// Project-scoped tabs. Each preserves the active ?project= scope so switching
// tabs keeps you on the same project (or "All projects").
const BASE_TABS = [
  { to: '/app/dashboard', label: 'Overview', icon: LayoutGridIcon },
  { to: '/app/analytics', label: 'Analytics', icon: ChartColumnIcon },
  { to: '/app/logs', label: 'Live logs', icon: ScrollTextIcon },
] as const

function tabClassName(active: boolean): string {
  return cn(
    'flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 font-medium text-sm transition-colors',
    active
      ? 'border-primary text-foreground'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  )
}

export function AppTopnav({ user }: { user: SessionUser }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { projectId } = useProject()
  const isSuperAdmin = user.role === 'super_admin'

  return (
    <header className="sticky top-0 z-20 flex flex-col border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        <KeenpixLogo />
        <span className="mx-0.5 hidden text-lg text-muted-foreground/40 sm:inline">
          /
        </span>
        <ProjectSwitcher />
        <div className="flex-1" />
        <a
          className="mr-1 hidden text-muted-foreground text-sm transition-colors hover:text-foreground md:inline"
          href="/docs"
        >
          Docs
        </a>
        <ModeToggle />
        <NavUser user={user} />
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto px-2">
        {BASE_TABS.map((tab) => {
          const Icon = tab.icon
          const active = pathname.startsWith(tab.to)
          return (
            <Link
              className={tabClassName(active)}
              key={tab.to}
              search={(prev) => ({ ...prev, project: projectId })}
              to={tab.to}
            >
              <Icon className={cn('size-4', active && 'text-primary')} />
              {tab.label}
            </Link>
          )
        })}

        {isSuperAdmin ? (
          <Link
            className={tabClassName(pathname.startsWith('/app/operations'))}
            search={(prev) => ({ ...prev, project: projectId })}
            to="/app/operations"
          >
            <ActivityIcon
              className={cn(
                'size-4',
                pathname.startsWith('/app/operations') && 'text-primary',
              )}
            />
            Operations
          </Link>
        ) : null}

        <Link
          className={tabClassName(pathname.startsWith('/app/settings'))}
          search={(prev) => ({ ...prev, project: projectId })}
          to="/app/settings"
        >
          <SettingsIcon
            className={cn(
              'size-4',
              pathname.startsWith('/app/settings') && 'text-primary',
            )}
          />
          Settings
        </Link>
      </nav>
    </header>
  )
}
