import {
  CheckIcon,
  ChevronsUpDownIcon,
  LayersIcon,
  PlusIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import type { Project } from '@/shared/types'
import { useProject } from '@/stores/project-context'

// The active scope is either org-wide ("All projects") or one project. That
// scope is mirrored into ?project= by the project context.
function ScopeGlyph({ project }: { project: Project | undefined }) {
  if (!project) {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LayersIcon className="size-3.5" />
      </span>
    )
  }
  return (
    <span
      className="size-6 shrink-0 rounded-md"
      style={{
        background: `linear-gradient(135deg, ${project.color1}, ${project.color2})`,
      }}
    />
  )
}

export function ProjectSwitcher() {
  const { projects, currentProject, isAll, projectId, setProject } =
    useProject()
  const [newOpen, setNewOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="h-9 max-w-56 gap-2 px-2 font-normal"
              variant="ghost"
            />
          }
        >
          <ScopeGlyph project={currentProject} />
          <span className="truncate font-medium text-sm">
            {isAll ? 'All projects' : currentProject?.name}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64" side="bottom">
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
                  <DropdownMenuItem key={p.id} onClick={() => setProject(p.id)}>
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
                        variant={p.env === 'production' ? 'success' : 'warning'}
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

      {/* Controlled from the switcher's New project menu item. */}
      <NewProjectDialog onOpenChange={setNewOpen} open={newOpen} />
    </>
  )
}
