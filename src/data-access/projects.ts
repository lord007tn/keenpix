/** Projects data-access — Prisma-backed. */
import { prisma } from '@/db'
import type { Project, ProjectEnv } from '@/shared/types'

const DEFAULT_ORG = 'org_default'

interface ProjectRow {
  allowedOrigins: string[]
  autoFormat: boolean
  color1: string
  color2: string
  createdAt: Date
  defaultQuality: number
  env: string
  id: string
  name: string
  orgId: string
  origin: string
  stripMetadata: boolean
}

function toProject(p: ProjectRow): Project {
  return {
    id: p.id,
    orgId: p.orgId,
    name: p.name,
    origin: p.origin,
    env: p.env as ProjectEnv,
    allowedOrigins: p.allowedOrigins,
    color1: p.color1,
    color2: p.color2,
    autoFormat: p.autoFormat,
    stripMetadata: p.stripMetadata,
    defaultQuality: p.defaultQuality,
    createdAt: p.createdAt.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
  }
}

export async function listProjects(orgId = DEFAULT_ORG): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(toProject)
}

export async function getProject(id: string): Promise<Project | undefined> {
  const p = await prisma.project.findUnique({ where: { id } })
  return p ? toProject(p) : undefined
}

const COLOR_PRESETS = [
  { color1: '#FF6B2C', color2: '#FFA76B' },
  { color1: '#14B8A6', color2: '#5DE3CE' },
  { color1: '#3A7BD5', color2: '#5DE3CE' },
  { color1: '#8B5CF6', color2: '#D8B4FE' },
  { color1: '#F59E0B', color2: '#FCD34D' },
  { color1: '#EF4444', color2: '#FCA5A5' },
] as const

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
  return toProject(created)
}

function deriveAllowedOriginsFromUrl(originUrl: string): string[] {
  try {
    return [new URL(originUrl).hostname]
  } catch {
    return []
  }
}

const SCHEME_RE = /^https?:\/\//
const PATH_RE = /\/.*$/
const PORT_RE = /:\d+$/

/** Normalize a user-entered host: drop scheme/path/port, lowercase. */
export function normalizeHost(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(SCHEME_RE, '')
    .replace(PATH_RE, '')
    .replace(PORT_RE, '')
}

export async function addAllowedOrigin(
  projectId: string,
  host: string,
): Promise<Project | undefined> {
  const p = await prisma.project.findUnique({ where: { id: projectId } })
  if (!p) {
    return
  }
  if (p.allowedOrigins.includes(host)) {
    return toProject(p)
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { allowedOrigins: { push: host } },
  })
  return toProject(updated)
}

export async function removeAllowedOrigin(
  projectId: string,
  host: string,
): Promise<Project | undefined> {
  // Read-modify-write inside a transaction so a concurrent add/remove isn't lost
  // (Prisma has no atomic array-remove the way `push` is atomic for the add).
  const updated = await prisma.$transaction(async (tx) => {
    const p = await tx.project.findUnique({ where: { id: projectId } })
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
  return updated ? toProject(updated) : undefined
}

export interface ProjectSettingsPatch {
  autoFormat?: boolean
  defaultQuality?: number
  stripMetadata?: boolean
}

/** Update a project's pipeline defaults (auto-format / strip-metadata / quality). */
export async function updateProjectSettings(
  projectId: string,
  patch: ProjectSettingsPatch,
): Promise<Project | undefined> {
  const p = await prisma.project.findUnique({ where: { id: projectId } })
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
  return toProject(updated)
}
