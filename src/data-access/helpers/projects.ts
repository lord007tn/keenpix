import type { Project as ProjectModel } from '@/generated/prisma/client'
import { isProjectEnv } from '@/shared/types'

export function projectData(project: ProjectModel) {
  return {
    id: project.id,
    orgId: project.orgId,
    name: project.name,
    origin: project.origin,
    env: isProjectEnv(project.env) ? project.env : 'production',
    allowedOrigins: project.allowedOrigins,
    color1: project.color1,
    color2: project.color2,
    autoFormat: project.autoFormat,
    stripMetadata: project.stripMetadata,
    defaultQuality: project.defaultQuality,
    createdAt: project.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
  }
}
