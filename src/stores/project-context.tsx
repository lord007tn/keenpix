import { useNavigate, useRouterState } from '@tanstack/react-router'
import { createContext, type ReactNode, use, useEffect, useMemo } from 'react'
import type { Project } from '@/shared/types'

interface ProjectContextValue {
  currentProject: Project | undefined
  isAll: boolean
  projectId: string | undefined
  projects: Project[]
  setProject: (id: string | null) => void
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export function ProjectProvider({
  projects,
  children,
}: {
  projects: Project[]
  children: ReactNode
}) {
  const navigate = useNavigate()
  // The active scope lives in the URL (?project=) so it survives refresh, is
  // shareable, and lets route loaders scope their queries. No param — or a
  // stale id that no longer matches a project — means "All projects".
  const searchProject = useRouterState({
    select: (s) =>
      typeof s.location.search.project === 'string'
        ? s.location.search.project
        : undefined,
  })

  useEffect(() => {
    if (
      searchProject &&
      !projects.some((project) => project.id === searchProject)
    ) {
      navigate({
        replace: true,
        to: '.',
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          domain: undefined,
          project: undefined,
        }),
      })
    }
  }, [navigate, projects, searchProject])

  const value = useMemo<ProjectContextValue>(() => {
    const projectId =
      searchProject && projects.some((p) => p.id === searchProject)
        ? searchProject
        : undefined
    const currentProject = projects.find((p) => p.id === projectId)
    return {
      projects,
      projectId,
      currentProject,
      isAll: projectId === undefined,
      setProject: (id: string | null) => {
        navigate({
          to: '.',
          search: (prev: Record<string, unknown>) => ({
            ...prev,
            domain: undefined,
            project: id ?? undefined,
          }),
        })
      },
    }
  }, [projects, searchProject, navigate])

  return <ProjectContext value={value}>{children}</ProjectContext>
}

export function useProject() {
  const ctx = use(ProjectContext)
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return ctx
}
