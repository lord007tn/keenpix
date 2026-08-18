import { createServerFn } from '@tanstack/react-start'
import {
  addAllowedHost,
  createProject,
  deleteProject,
  getProjectSigning,
  listProjects,
  removeAllowedHost,
  rotateProjectSigningSecret,
  updateProject,
  updateProjectSettings,
  updateProjectSigning,
} from '@/actions/projects'
import {
  authMiddleware,
  requireActiveOrg,
  requireOrgAdmin,
} from '@/lib/auth/guards'
import {
  assertCanCreateProject,
  assertHasProductAccess,
} from '@/lib/billing/quota'
import {
  allowedHostSchema,
  createProjectSchema,
  deleteProjectSchema,
  projectSettingsSchema,
  projectSigningReadSchema,
  projectSigningSchema,
  updateProjectSchema,
} from '@/schemas/projects'

export const listProjectsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => listProjects(requireActiveOrg(context)))

export const createProjectFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(createProjectSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertCanCreateProject(orgId)
    return createProject(orgId, {
      name: data.name,
      origin: data.origin,
    })
  })

export const addAllowedHostFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(allowedHostSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const project = await addAllowedHost(orgId, data.projectId, data.host)
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const removeAllowedHostFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(allowedHostSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const project = await removeAllowedHost(orgId, data.projectId, data.host)
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const updateProjectFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(updateProjectSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const project = await updateProject(orgId, data.projectId, {
      name: data.name,
      origin: data.origin,
    })
    if (!project) {
      throw new Error('Project not found')
    }
    return { id: project.id, name: project.name, origin: project.origin }
  })

export const deleteProjectFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(deleteProjectSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const deleted = await deleteProject(orgId, data.projectId)
    if (!deleted) {
      throw new Error('Project not found')
    }
    return { deleted: true }
  })

export const getProjectSigningFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator(projectSigningReadSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const signing = await getProjectSigning(orgId, data.projectId)
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const updateProjectSigningFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(projectSigningSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const signing = await updateProjectSigning(
      orgId,
      data.projectId,
      data.requireSignedUrls,
      data.signedUrlTtlSeconds,
    )
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const rotateProjectSigningSecretFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(projectSigningReadSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const signing = await rotateProjectSigningSecret(orgId, data.projectId)
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const updateProjectSettingsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(projectSettingsSchema)
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertHasProductAccess(orgId)
    const project = await updateProjectSettings(orgId, data.projectId, {
      autoFormat: data.autoFormat,
      stripMetadata: data.stripMetadata,
      defaultQuality: data.defaultQuality,
      maxWidth: data.maxWidth,
      defaultFit: data.defaultFit,
      defaultDpr: data.defaultDpr,
      watermarkEnabled: data.watermarkEnabled,
      watermarkUrl: data.watermarkUrl,
      watermarkPosition: data.watermarkPosition,
      watermarkOpacity: data.watermarkOpacity,
      watermarkScale: data.watermarkScale,
      watermarkMargin: data.watermarkMargin,
    })
    if (!project) {
      throw new Error('Project not found')
    }
    return {
      autoFormat: project.autoFormat,
      stripMetadata: project.stripMetadata,
      defaultQuality: project.defaultQuality,
      maxWidth: project.maxWidth,
      defaultFit: project.defaultFit,
      defaultDpr: project.defaultDpr,
      watermarkEnabled: project.watermarkEnabled,
      watermarkUrl: project.watermarkUrl,
      watermarkPosition: project.watermarkPosition,
      watermarkOpacity: project.watermarkOpacity,
      watermarkScale: project.watermarkScale,
      watermarkMargin: project.watermarkMargin,
    }
  })
