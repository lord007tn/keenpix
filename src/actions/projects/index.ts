import type { z } from 'zod'
import {
  addAllowedOrigin,
  createProject as createProjectInDb,
  deleteProject as deleteProjectFromDb,
  getProject as getProjectFromDb,
  getProjectSigning as getProjectSigningFromDb,
  listProjects as listProjectsInDb,
  removeAllowedOrigin,
  updateProject as updateProjectInDb,
  updateProjectSettings as updateProjectSettingsInDb,
  updateProjectSigning as updateProjectSigningInDb,
} from '@/data-access/projects'
import { generateSigningSecret } from '@/lib/transform-signing/signing'
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

export function getProjectSigning(orgId: string, projectId: string) {
  return getProjectSigningFromDb(projectId, orgId)
}

// Toggle URL signing. Enabling for the first time mints the project's secret;
// disabling keeps it so signed integrations don't break on a re-enable.
export async function updateProjectSigning(
  orgId: string,
  projectId: string,
  requireSignedUrls: boolean,
) {
  const current = await getProjectSigningFromDb(projectId, orgId)
  if (!current) {
    return
  }
  const patch: { requireSignedUrls: boolean; signingSecret?: string } = {
    requireSignedUrls,
  }
  if (requireSignedUrls && !current.signingSecret) {
    patch.signingSecret = generateSigningSecret()
  }
  return updateProjectSigningInDb(projectId, orgId, patch)
}

// Mint a new secret, invalidating every URL signed with the old one. Callers
// re-sign from the new secret shown in settings.
export function rotateProjectSigningSecret(orgId: string, projectId: string) {
  return updateProjectSigningInDb(projectId, orgId, {
    signingSecret: generateSigningSecret(),
  })
}
