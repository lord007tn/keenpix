import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpenIcon,
  ChartColumnIcon,
  LayoutGridIcon,
  ScrollTextIcon,
  SettingsIcon,
} from 'lucide-react'
import { NavUser } from '@/components/app/nav-user'
import { ProjectSwitcher } from '@/components/app/project-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import type { SessionUser } from '@/functions/auth'
import { RELEASES_URL } from '@/shared/repository'
import { APP_VERSION } from '@/shared/seo'
import { useProject } from '@/stores/project-context'

const PROJECT_NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutGridIcon },
  { to: '/app/analytics', label: 'Analytics', icon: ChartColumnIcon },
  { to: '/app/logs', label: 'Live logs', icon: ScrollTextIcon },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon },
] as const

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { projectId } = useProject()

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <ProjectSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Project</SidebarGroupLabel>
          <SidebarMenu>
            {PROJECT_NAV.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.to)}
                  render={
                    <Link
                      search={(prev) => ({ ...prev, project: projectId })}
                      to={item.to}
                    />
                  }
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                // biome-ignore lint/a11y/useAnchorContent: the icon + "Documentation" label are merged into the anchor by Base UI's render prop
                <a href="/docs" />
              }
              tooltip="Documentation"
            >
              <BookOpenIcon />
              <span>Documentation</span>
            </SidebarMenuButton>
            <div className="px-2 pt-1 pb-2 group-data-[collapsible=icon]:hidden">
              <a
                aria-label={`Keenpix v${APP_VERSION} — view releases on GitHub`}
                className="font-mono text-[10px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                href={RELEASES_URL}
                rel="noreferrer"
                target="_blank"
                title="View releases on GitHub"
              >
                v{APP_VERSION}
              </a>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
