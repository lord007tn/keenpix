import dayjs from 'dayjs'
import { prisma } from '@/db'
import { isProjectEnv, type Project, type ProjectEnv } from '@/shared/types'

const DEFAULT_ORG = 'org_default'

// Returns the id only when it belongs to a real project in the org, so an
// unknown/stale ?project= id consistently collapses to "all projects" for both
// the data scope and the rendered scope.
export async function resolveProjectId(
  id: string | undefined,
  orgId = DEFAULT_ORG,
): Promise<string | undefined> {
  if (!id) {
    return
  }
  const found = await prisma.project.findFirst({
    where: { id, orgId },
    select: { id: true },
  })
  return found?.id
}

export async function listProjects(orgId = DEFAULT_ORG): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((project) => ({
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
    createdAt: dayjs(project.createdAt).format('MMM DD, YYYY'),
  }))
}

export async function getProject(
  id: string,
  orgId = DEFAULT_ORG,
): Promise<Project | undefined> {
  const p = await prisma.project.findFirst({ where: { id, orgId } })
  return p
    ? {
        id: p.id,
        orgId: p.orgId,
        name: p.name,
        origin: p.origin,
        env: isProjectEnv(p.env) ? p.env : 'production',
        allowedOrigins: p.allowedOrigins,
        color1: p.color1,
        color2: p.color2,
        autoFormat: p.autoFormat,
        stripMetadata: p.stripMetadata,
        defaultQuality: p.defaultQuality,
        createdAt: dayjs(p.createdAt).format('MMM DD, YYYY'),
      }
    : undefined
}

const COLOR_PRESETS = [
  { color1: '#FF6B2C', color2: '#FFA76B' },
  { color1: '#14B8A6', color2: '#5DE3CE' },
  { color1: '#3A7BD5', color2: '#5DE3CE' },
  { color1: '#8B5CF6', color2: '#D8B4FE' },
  { color1: '#F59E0B', color2: '#FCD34D' },
  { color1: '#EF4444', color2: '#FCA5A5' },
]

export interface NewProjectInput {
  allowedOrigins?: string[]
  env?: ProjectEnv
  name: string
  orgId: string
  origin: string
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const count = await prisma.project.count({ where: { orgId: input.orgId } })
  const palette = COLOR_PRESETS[count % COLOR_PRESETS.length]
  const created = await prisma.project.create({
    data: {
      orgId: input.orgId,
      name: input.name,
      origin: input.origin,
      env: input.env ?? 'production',
      allowedOrigins:
        input.allowedOrigins ?? deriveAllowedOriginsFromUrl(input.origin),
      color1: palette.color1,
      color2: palette.color2,
    },
  })
  return {
    id: created.id,
    orgId: created.orgId,
    name: created.name,
    origin: created.origin,
    env: isProjectEnv(created.env) ? created.env : 'production',
    allowedOrigins: created.allowedOrigins,
    color1: created.color1,
    color2: created.color2,
    autoFormat: created.autoFormat,
    stripMetadata: created.stripMetadata,
    defaultQuality: created.defaultQuality,
    createdAt: dayjs(created.createdAt).format('MMM DD, YYYY'),
  }
}

function deriveAllowedOriginsFromUrl(originUrl: string): string[] {
  try {
    return [new URL(originUrl).hostname]
  } catch {
    return []
  }
}

export async function addAllowedOrigin(
  projectId: string,
  host: string,
  orgId = DEFAULT_ORG,
): Promise<Project | undefined> {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } })
  if (!p) {
    return
  }
  if (p.allowedOrigins.includes(host)) {
    return {
      id: p.id,
      orgId: p.orgId,
      name: p.name,
      origin: p.origin,
      env: isProjectEnv(p.env) ? p.env : 'production',
      allowedOrigins: p.allowedOrigins,
      color1: p.color1,
      color2: p.color2,
      autoFormat: p.autoFormat,
      stripMetadata: p.stripMetadata,
      defaultQuality: p.defaultQuality,
      createdAt: dayjs(p.createdAt).format('MMM DD, YYYY'),
    }
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { allowedOrigins: { push: host } },
  })
  return {
    id: updated.id,
    orgId: updated.orgId,
    name: updated.name,
    origin: updated.origin,
    env: isProjectEnv(updated.env) ? updated.env : 'production',
    allowedOrigins: updated.allowedOrigins,
    color1: updated.color1,
    color2: updated.color2,
    autoFormat: updated.autoFormat,
    stripMetadata: updated.stripMetadata,
    defaultQuality: updated.defaultQuality,
    createdAt: dayjs(updated.createdAt).format('MMM DD, YYYY'),
  }
}

export async function removeAllowedOrigin(
  projectId: string,
  host: string,
  orgId = DEFAULT_ORG,
): Promise<Project | undefined> {
  // Read-modify-write inside a transaction so a concurrent add/remove isn't lost
  // (Prisma has no atomic array-remove the way `push` is atomic for the add).
  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.project.findFirst({
      where: { id: projectId, orgId },
    })
    if (!p) {
      return null
    }
    return tx.project.update({
      where: { id: projectId },
      data: {
        allowedOrigins: { set: p.allowedOrigins.filter((o) => o !== host) },
      },
    })
  })
  return updated
    ? {
        id: updated.id,
        orgId: updated.orgId,
        name: updated.name,
        origin: updated.origin,
        env: isProjectEnv(updated.env) ? updated.env : 'production',
        allowedOrigins: updated.allowedOrigins,
        color1: updated.color1,
        color2: updated.color2,
        autoFormat: updated.autoFormat,
        stripMetadata: updated.stripMetadata,
        defaultQuality: updated.defaultQuality,
        createdAt: dayjs(updated.createdAt).format('MMM DD, YYYY'),
      }
    : undefined
}

export interface ProjectSettingsPatch {
  autoFormat?: boolean
  defaultQuality?: number
  stripMetadata?: boolean
}

export async function updateProjectSettings(
  projectId: string,
  patch: ProjectSettingsPatch,
  orgId = DEFAULT_ORG,
): Promise<Project | undefined> {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } })
  if (!p) {
    return
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      autoFormat: patch.autoFormat ?? p.autoFormat,
      stripMetadata: patch.stripMetadata ?? p.stripMetadata,
      defaultQuality: patch.defaultQuality ?? p.defaultQuality,
    },
  })
  return {
    id: updated.id,
    orgId: updated.orgId,
    name: updated.name,
    origin: updated.origin,
    env: isProjectEnv(updated.env) ? updated.env : 'production',
    allowedOrigins: updated.allowedOrigins,
    color1: updated.color1,
    color2: updated.color2,
    autoFormat: updated.autoFormat,
    stripMetadata: updated.stripMetadata,
    defaultQuality: updated.defaultQuality,
    createdAt: dayjs(updated.createdAt).format('MMM DD, YYYY'),
  }
}
