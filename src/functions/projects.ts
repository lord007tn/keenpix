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
import { assertCanCreateProject } from '@/lib/billing/quota'
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
  .inputValidator(createProjectSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const orgId = requireOrgAdmin(context)
    await assertCanCreateProject(orgId)
    return createProject(orgId, {
      name: data.name,
      origin: data.origin,
    })
  })

export const addAllowedHostFn = createServerFn({ method: 'POST' })
  .inputValidator(allowedHostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const project = await addAllowedHost(
      requireOrgAdmin(context),
      data.projectId,
      data.host,
    )
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const removeAllowedHostFn = createServerFn({ method: 'POST' })
  .inputValidator(allowedHostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const project = await removeAllowedHost(
      requireOrgAdmin(context),
      data.projectId,
      data.host,
    )
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const updateProjectFn = createServerFn({ method: 'POST' })
  .inputValidator(updateProjectSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const project = await updateProject(
      requireOrgAdmin(context),
      data.projectId,
      {
        name: data.name,
        origin: data.origin,
      },
    )
    if (!project) {
      throw new Error('Project not found')
    }
    return { id: project.id, name: project.name, origin: project.origin }
  })

export const deleteProjectFn = createServerFn({ method: 'POST' })
  .inputValidator(deleteProjectSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const deleted = await deleteProject(
      requireOrgAdmin(context),
      data.projectId,
    )
    if (!deleted) {
      throw new Error('Project not found')
    }
    return { deleted: true }
  })

export const getProjectSigningFn = createServerFn({ method: 'GET' })
  .inputValidator(projectSigningReadSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const signing = await getProjectSigning(
      requireOrgAdmin(context),
      data.projectId,
    )
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const updateProjectSigningFn = createServerFn({ method: 'POST' })
  .inputValidator(projectSigningSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const signing = await updateProjectSigning(
      requireOrgAdmin(context),
      data.projectId,
      data.requireSignedUrls,
    )
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const rotateProjectSigningSecretFn = createServerFn({ method: 'POST' })
  .inputValidator(projectSigningReadSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const signing = await rotateProjectSigningSecret(
      requireOrgAdmin(context),
      data.projectId,
    )
    if (!signing) {
      throw new Error('Project not found')
    }
    return signing
  })

export const updateProjectSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(projectSettingsSchema)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const project = await updateProjectSettings(
      requireOrgAdmin(context),
      data.projectId,
      {
        autoFormat: data.autoFormat,
        stripMetadata: data.stripMetadata,
        defaultQuality: data.defaultQuality,
        maxWidth: data.maxWidth,
        defaultFit: data.defaultFit,
        defaultDpr: data.defaultDpr,
      },
    )
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
    }
  })
