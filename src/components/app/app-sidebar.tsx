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
import { useProject } from '@/stores/project-context'

const NAV = [
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
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.to)}
                  render={<Link search={{ project: projectId }} to={item.to} />}
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
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
