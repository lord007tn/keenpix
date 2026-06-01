import { useRouterState } from '@tanstack/react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useProject } from '@/stores/project-context'

const SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  logs: 'Live logs',
  account: 'Account',
  workspace: 'Workspace',
  settings: 'Settings',
}

// Account and Workspace are instance-wide, not scoped to a project, so the
// breadcrumb shows the workspace rather than the active project scope.
const GLOBAL_SECTIONS = new Set(['account', 'workspace'])

export function AppTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { currentProject, isAll } = useProject()
  const section = pathname.split('/')[2] ?? 'dashboard'
  const title = SECTION_TITLES[section] ?? section
  let scope: string | undefined = currentProject?.name
  if (GLOBAL_SECTIONS.has(section)) {
    scope = 'Keenpix'
  } else if (isAll) {
    scope = 'All projects'
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-4">
      <SidebarTrigger className="-ml-1 size-9 md:size-7" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="text-muted-foreground">
            {scope}
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  )
}
