import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  addAllowedOrigin,
  createProject,
  listProjects,
  normalizeHost,
  removeAllowedOrigin,
  updateProjectSettings,
} from '@/data-access/projects'
import { authMiddleware } from '@/lib/auth/guards'

const DEFAULT_ORG = 'org_default'

export const listProjectsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(() => listProjects())

const createProjectSchema = z.object({
  name: z.string().min(1).max(80),
  origin: z.string().url('Must be a full URL, e.g. https://cdn.example.com'),
  env: z.enum(['production', 'staging', 'development']).default('production'),
})

export const createProjectFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(createProjectSchema)
  .handler(({ data }) =>
    createProject({
      orgId: DEFAULT_ORG,
      name: data.name,
      origin: data.origin,
      env: data.env,
    }),
  )

const hostSchema = z.object({
  projectId: z.string().min(1),
  host: z.string().min(1).max(255),
})

const HOST_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/

export const addAllowedHostFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(hostSchema)
  .handler(async ({ data }) => {
    const host = normalizeHost(data.host)
    if (!HOST_RE.test(host)) {
      throw new Error('Enter a valid host, e.g. images.example.com')
    }
    const project = await addAllowedOrigin(data.projectId, host)
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

export const removeAllowedHostFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(hostSchema)
  .handler(async ({ data }) => {
    const project = await removeAllowedOrigin(
      data.projectId,
      normalizeHost(data.host),
    )
    if (!project) {
      throw new Error('Project not found')
    }
    return { allowedOrigins: project.allowedOrigins }
  })

const settingsSchema = z.object({
  projectId: z.string().min(1),
  autoFormat: z.boolean().optional(),
  stripMetadata: z.boolean().optional(),
  defaultQuality: z.number().int().min(30).max(100).optional(),
})

export const updateProjectSettingsFn = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(settingsSchema)
  .handler(async ({ data }) => {
    const project = await updateProjectSettings(data.projectId, {
      autoFormat: data.autoFormat,
      stripMetadata: data.stripMetadata,
      defaultQuality: data.defaultQuality,
    })
    if (!project) {
      throw new Error('Project not found')
    }
    return {
      autoFormat: project.autoFormat,
      stripMetadata: project.stripMetadata,
      defaultQuality: project.defaultQuality,
    }
  })
