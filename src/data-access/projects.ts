import { prisma } from '@/db'
import type { Project, ProjectEnv } from '@/shared/types'
import { projectData } from './helpers/projects'

const DEFAULT_ORG = 'org_default'

export async function listProjects(orgId = DEFAULT_ORG): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(projectData)
}

export async function getProject(
  id: string,
  orgId = DEFAULT_ORG,
): Promise<Project | undefined> {
  const p = await prisma.project.findFirst({ where: { id, orgId } })
  return p ? projectData(p) : undefined
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
  return projectData(created)
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
    return projectData(p)
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { allowedOrigins: { push: host } },
  })
  return projectData(updated)
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
  return updated ? projectData(updated) : undefined
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
  return projectData(updated)
}
