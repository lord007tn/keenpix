import type { z } from 'zod'
import {
  addAllowedOrigin,
  createProject as createProjectInDb,
  deleteProject as deleteProjectFromDb,
  getProject as getProjectFromDb,
  listProjects as listProjectsInDb,
  removeAllowedOrigin,
  updateProject as updateProjectInDb,
  updateProjectSettings as updateProjectSettingsInDb,
} from '@/data-access/projects'
import type {
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
} from '@/schemas/projects'

// Every project use case is org-scoped: callers must pass the resolved active
// org (UI: session active org; SDK: the key's org). There is no default — a
// missing org is a compile error, not a silent fall-back to a shared tenant.

export function listProjects(orgId: string) {
  return listProjectsInDb(orgId)
}

export function getProject(orgId: string, id: string) {
  return getProjectFromDb(id, orgId)
}

export function createProject(
  orgId: string,
  input: z.output<typeof internalCreateProjectSchema>,
) {
  return createProjectInDb({
    orgId,
    name: input.name,
    origin: input.origin,
    allowedOrigins: input.allowedOrigins,
  })
}

export function addAllowedHost(orgId: string, projectId: string, host: string) {
  return addAllowedOrigin(projectId, host, orgId)
}

export function removeAllowedHost(
  orgId: string,
  projectId: string,
  host: string,
) {
  return removeAllowedOrigin(projectId, host, orgId)
}

export function updateProjectSettings(
  orgId: string,
  projectId: string,
  patch: z.output<typeof internalProjectSettingsPatchSchema>,
) {
  return updateProjectSettingsInDb(projectId, patch, orgId)
}

export function updateProject(
  orgId: string,
  projectId: string,
  patch: { name?: string; origin?: string },
) {
  return updateProjectInDb(projectId, orgId, patch)
}

export function deleteProject(orgId: string, projectId: string) {
  return deleteProjectFromDb(projectId, orgId)
}
