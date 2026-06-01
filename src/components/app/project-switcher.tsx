import {
  CheckIcon,
  ChevronsUpDownIcon,
  LayersIcon,
  PlusIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import type { Project } from '@/shared/types'
import { useProject } from '@/stores/project-context'

// The active scope is either org-wide ("All projects") or one project. That
// scope is mirrored into ?project= by the project context.
function ScopeGlyph({ project }: { project: Project | undefined }) {
  if (!project) {
    return (
      <span className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
        <LayersIcon className="size-4" />
      </span>
    )
  }
  return (
    <span
      className="size-8 shrink-0 rounded-md"
      style={{
        background: `linear-gradient(135deg, ${project.color1}, ${project.color2})`,
      }}
    />
  )
}

export function ProjectSwitcher() {
  const { projects, currentProject, isAll, projectId, setProject } =
    useProject()
  const { isMobile } = useSidebar()
  const [newOpen, setNewOpen] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="aria-expanded:bg-sidebar-accent"
                size="lg"
              />
            }
          >
            <ScopeGlyph project={currentProject} />
            <div className="flex min-w-0 flex-col gap-0.5 leading-none">
              <span className="truncate font-semibold">
                {isAll ? 'All projects' : currentProject?.name}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {isAll
                  ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`
                  : currentProject?.origin}
              </span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Scope</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setProject(null)}>
                <span className="flex size-6 items-center justify-center rounded-md border bg-muted">
                  <LayersIcon className="size-3.5" />
                </span>
                <span className="truncate">All projects</span>
                {isAll ? <CheckIcon className="ml-auto size-4" /> : null}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {projects.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Projects</DropdownMenuLabel>
                  {projects.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => setProject(p.id)}
                    >
                      <span
                        className="size-6 shrink-0 rounded-md"
                        style={{
                          background: `linear-gradient(135deg, ${p.color1}, ${p.color2})`,
                        }}
                      />
                      <span className="truncate">{p.name}</span>
                      {projectId === p.id ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <Badge
                          className="ml-auto"
                          variant={
                            p.env === 'production' ? 'success' : 'warning'
                          }
                        >
                          {p.env}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setNewOpen(true)}>
              <span className="flex size-6 items-center justify-center rounded-md border">
                <PlusIcon className="size-3.5" />
              </span>
              New project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {/* Controlled from the switcher's New project menu item. */}
      <NewProjectDialog onOpenChange={setNewOpen} open={newOpen} />
    </SidebarMenu>
  )
}
