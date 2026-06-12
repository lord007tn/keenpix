import { createServerFn } from '@tanstack/react-start'
import {
  addAllowedHost,
  createProject,
  listProjects,
  removeAllowedHost,
  updateProjectSettings,
} from '@/actions/projects'
import { authMiddleware } from '@/lib/auth/guards'
import {
  allowedHostSchema,
  createProjectSchema,
  projectSettingsSchema,
} from '@/schemas/projects'

export const listProjectsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => listProjects())

export const createProjectFn = createServerFn({ method: 'POST' })
  .inputValidator(createProjectSchema)
  .middleware([authMiddleware])
  .handler(({ data }) =>
    createProject({
      name: data.name,
      origin: data.origin,
    }),
  )

export const addAllowedHostFn = createServerFn({ method: 'POST' })
  .inputValidator(allowedHostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const project = await addAllowedHost(data.projectId, data.host)
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const removeAllowedHostFn = createServerFn({ method: 'POST' })
  .inputValidator(allowedHostSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const project = await removeAllowedHost(data.projectId, data.host)
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const updateProjectSettingsFn = createServerFn({ method: 'POST' })
  .inputValidator(projectSettingsSchema)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    const project = await updateProjectSettings(data.projectId, {
      autoFormat: data.autoFormat,
      stripMetadata: data.stripMetadata,
      defaultQuality: data.defaultQuality,
      maxWidth: data.maxWidth,
      defaultFit: data.defaultFit,
      defaultDpr: data.defaultDpr,
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
    }
  })
