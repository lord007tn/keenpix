import dayjs from 'dayjs'
import { prisma } from '@/db'
import type { Project, ProjectFit } from '@/shared/types'

const DEFAULT_ORG = 'org_default'

// Single source of truth for shaping a Prisma project row into the domain
// Project. Writes validate defaultFit, so the cast holds at the boundary.
function toProject(
  p: NonNullable<Awaited<ReturnType<typeof prisma.project.findFirst>>>,
): Project {
  return {
    id: p.id,
    orgId: p.orgId,
    name: p.name,
    origin: p.origin,
    allowedOrigins: p.allowedOrigins,
    color1: p.color1,
    color2: p.color2,
    autoFormat: p.autoFormat,
    stripMetadata: p.stripMetadata,
    defaultQuality: p.defaultQuality,
    maxWidth: p.maxWidth,
    defaultFit: p.defaultFit as ProjectFit,
    defaultDpr: p.defaultDpr,
    createdAt: dayjs(p.createdAt).format('MMM DD, YYYY'),
  }
}

// Returns the id only when it belongs to a real project in the org, so an
// unknown/stale ?project= id consistently collapses to "all projects" for both
// the data scope and the rendered scope.
export async function resolveProjectId(
  id: string | undefined,
  orgId = DEFAULT_ORG,
) {
  if (!id) {
    return
  }
  const found = await prisma.project.findFirst({
    where: { id, orgId },
    select: { id: true },
  })
  return found?.id
}

export async function listProjects(orgId = DEFAULT_ORG) {
  const rows = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(toProject)
}

export async function getProject(id: string, orgId = DEFAULT_ORG) {
  const p = await prisma.project.findFirst({ where: { id, orgId } })
  return p ? toProject(p) : undefined
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
  name: string
  orgId: string
  origin: string
}

export async function createProject(input: NewProjectInput) {
  const count = await prisma.project.count({ where: { orgId: input.orgId } })
  const palette = COLOR_PRESETS[count % COLOR_PRESETS.length]
  const created = await prisma.project.create({
    data: {
      orgId: input.orgId,
      name: input.name,
      origin: input.origin,
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

export async function addAllowedOrigin(
  projectId: string,
  host: string,
  orgId = DEFAULT_ORG,
) {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } })
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
  orgId = DEFAULT_ORG,
) {
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
  return updated ? toProject(updated) : undefined
}

export interface ProjectSettingsPatch {
  autoFormat?: boolean
  defaultDpr?: number
  defaultFit?: ProjectFit
  defaultQuality?: number
  maxWidth?: number
  stripMetadata?: boolean
}

export async function updateProjectSettings(
  projectId: string,
  patch: ProjectSettingsPatch,
  orgId = DEFAULT_ORG,
) {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } })
  if (!p) {
    return
  }
  // maxWidth === 0 clears the cap; undefined leaves it unchanged.
  let maxWidth = p.maxWidth
  if (patch.maxWidth !== undefined) {
    maxWidth = patch.maxWidth === 0 ? null : patch.maxWidth
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      autoFormat: patch.autoFormat ?? p.autoFormat,
      stripMetadata: patch.stripMetadata ?? p.stripMetadata,
      defaultQuality: patch.defaultQuality ?? p.defaultQuality,
      defaultFit: patch.defaultFit ?? p.defaultFit,
      defaultDpr: patch.defaultDpr ?? p.defaultDpr,
      maxWidth,
    },
  })
  return toProject(updated)
}
