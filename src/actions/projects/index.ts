import type { z } from 'zod'
import {
  addAllowedOrigin,
  createProject as createProjectInDb,
  getProject as getProjectFromDb,
  listProjects as listProjectsInDb,
  removeAllowedOrigin,
  updateProjectSettings as updateProjectSettingsInDb,
} from '@/data-access/projects'
import type {
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
} from '@/schemas/projects'

const DEFAULT_ORG = 'org_default'

export function listProjects() {
  return listProjectsInDb(DEFAULT_ORG)
}

export function getProject(id: string) {
  return getProjectFromDb(id, DEFAULT_ORG)
}

export function createProject(
  input: z.output<typeof internalCreateProjectSchema>,
) {
  return createProjectInDb({
    orgId: DEFAULT_ORG,
    name: input.name,
    origin: input.origin,
    env: input.env,
    allowedOrigins: input.allowedOrigins,
  })
}

export function addAllowedHost(projectId: string, host: string) {
  return addAllowedOrigin(projectId, host, DEFAULT_ORG)
}

export function removeAllowedHost(projectId: string, host: string) {
  return removeAllowedOrigin(projectId, host, DEFAULT_ORG)
}

export function updateProjectSettings(
  projectId: string,
  patch: z.output<typeof internalProjectSettingsPatchSchema>,
) {
  return updateProjectSettingsInDb(projectId, patch, DEFAULT_ORG)
}
