import { Link, useRouterState } from '@tanstack/react-router'
import {
  ChartColumnIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  SettingsIcon,
  SparklesIcon,
} from 'lucide-react'
import { KeenpixLogo } from '@/components/app/keenpix-logo'
import { NavUser } from '@/components/app/nav-user'
import { OrganizationSwitcher } from '@/components/app/organization-switcher'
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

export function AppTopnav({
  cloud,
  workspaceReady,
  user,
}: {
  cloud: boolean
  workspaceReady: boolean
  user: SessionUser
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { projectId } = useProject()

  return (
    <header className="sticky top-0 z-20 flex flex-col border-b bg-background">
      <div className="flex h-14 items-center gap-1 px-2 sm:gap-2 sm:px-4">
        <KeenpixLogo showName={false} />
        {cloud ? (
          <>
            <span className="mx-0.5 hidden text-lg text-muted-foreground/40 sm:inline">
              /
            </span>
            <OrganizationSwitcher />
          </>
        ) : null}
        {workspaceReady ? (
          <>
            <span className="mx-0.5 hidden text-lg text-muted-foreground/40 md:inline">
              /
            </span>
            <ProjectSwitcher />
          </>
        ) : (
          <>
            <span className="mx-0.5 hidden text-lg text-muted-foreground/40 sm:inline">
              /
            </span>
            <span className="hidden items-center gap-1.5 text-muted-foreground text-sm sm:flex">
              <SparklesIcon className="size-4 text-primary" />
              Workspace setup
            </span>
          </>
        )}
        <div className="flex-1" />
        <a
          className="mr-1 hidden text-muted-foreground text-sm transition-colors hover:text-foreground md:inline"
          href="/docs"
        >
          Docs
        </a>
        <ModeToggle />
        <NavUser cloud={cloud} user={user} />
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto px-2">
        {workspaceReady ? (
          BASE_TABS.map((tab) => {
            const Icon = tab.icon
            const active = pathname.startsWith(tab.to)
            return (
              <Link
                className={tabClassName(active)}
                key={tab.to}
                search={(prev) => ({
                  ...prev,
                  project: projectId,
                  range: prev.range ?? '24h',
                })}
                to={tab.to}
              >
                <Icon className={cn('size-4', active && 'text-primary')} />
                {tab.label}
              </Link>
            )
          })
        ) : (
          <Link
            className={tabClassName(pathname.startsWith('/app/onboarding'))}
            search={(prev) => ({ ...prev, project: projectId })}
            to="/app/onboarding"
          >
            <SparklesIcon
              className={cn(
                'size-4',
                pathname.startsWith('/app/onboarding') && 'text-primary',
              )}
            />
            Get started
          </Link>
        )}

        <Link
          className={tabClassName(pathname.startsWith('/app/settings'))}
          search={(prev) => ({
            ...prev,
            project: projectId,
            section: undefined,
          })}
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
