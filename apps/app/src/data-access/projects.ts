import { prisma } from '@keenpix/database'
import dayjs from 'dayjs'
import type { Project, ProjectFit, WatermarkPosition } from '@/shared/types'

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
    requireSignedUrls: p.requireSignedUrls,
    signedUrlTtlSeconds: p.signedUrlTtlSeconds,
    watermarkEnabled: p.watermarkEnabled,
    watermarkUrl: p.watermarkUrl,
    watermarkPosition: p.watermarkPosition as WatermarkPosition,
    watermarkOpacity: p.watermarkOpacity,
    watermarkScale: p.watermarkScale,
    watermarkMargin: p.watermarkMargin,
    createdAt: dayjs(p.createdAt).format('MMM DD, YYYY'),
  }
}

// Returns the id only when it belongs to a real project in the org. Callers must
// keep an explicitly requested but missing id scoped to no data; they must not
// widen it to the organization's all-projects view.
export async function resolveProjectId(id: string | undefined, orgId: string) {
  if (!id) {
    return
  }
  const found = await prisma.project.findFirst({
    where: { id, orgId },
    select: { id: true },
  })
  return found?.id
}

export async function listProjects(orgId: string) {
  const rows = await prisma.project.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map(toProject)
}

// Operator-only cross-tenant count for the platform admin health view. Deliberately
// NOT org-scoped — never use this for a tenant-facing read.
export function countAllProjects() {
  return prisma.project.count()
}

export async function getProject(id: string, orgId: string) {
  const p = await prisma.project.findFirst({ where: { id, orgId } })
  return p ? toProject(p) : undefined
}

// Org-agnostic lookup for the PUBLIC transform data plane (`/img/*`): a request
// carries only a project id and is gated by the project's own allowlist, never a
// session org. Never use this for UI/dashboard reads — those must be org-scoped
// via getProject(id, orgId). Carries the signing secret (verification happens on
// this path), which the shared Project shape deliberately omits.
export async function getProjectById(id: string) {
  const p = await prisma.project.findFirst({ where: { id } })
  return p
    ? {
        ...toProject(p),
        signingKeyVersion: p.signingKeyVersion,
        signingSecret: p.signingSecret,
      }
    : undefined
}

// The signing config an org admin manages: the toggle plus the secret itself.
export async function getProjectSigning(projectId: string, orgId: string) {
  const p = await prisma.project.findFirst({
    where: { id: projectId, orgId },
    select: {
      requireSignedUrls: true,
      signedUrlTtlSeconds: true,
      signingKeyVersion: true,
      signingSecret: true,
    },
  })
  return p ?? undefined
}

export async function updateProjectSigning(
  projectId: string,
  orgId: string,
  patch: {
    requireSignedUrls?: boolean
    signedUrlTtlSeconds?: number | null
    signingKeyVersion?: number
    signingSecret?: string
  },
) {
  const result = await prisma.project.updateMany({
    where: { id: projectId, orgId },
    data: patch,
  })
  if (result.count === 0) {
    return
  }
  return getProjectSigning(projectId, orgId)
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
  orgId: string,
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
  orgId: string,
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

// Rename / re-point a project's origin. Org-scoped so a tenant can only edit its
// own. The allowlist is left untouched — re-pointing the origin doesn't imply the
// new host is allowed, so the user manages hosts explicitly under Security.
export async function updateProject(
  projectId: string,
  orgId: string,
  patch: { name?: string; origin?: string },
) {
  const p = await prisma.project.findFirst({ where: { id: projectId, orgId } })
  if (!p) {
    return
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name: patch.name ?? p.name, origin: patch.origin ?? p.origin },
  })
  return toProject(updated)
}

// Delete a project (org-scoped). Request logs cascade via their FK; the hourly
// rollups (keyed by orgId, no FK) are retained so billing usage stays accurate.
// Returns whether a row was actually deleted.
export function deleteProject(projectId: string, orgId: string) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, orgId },
      select: { id: true },
    })
    if (!project) {
      return false
    }
    // Project-scoped keys cannot outlive their authorization target. Delete the
    // Better Auth key rows first; activities and scopes cascade with them.
    await tx.apiKey.deleteMany({
      where: { scope: { is: { orgId, projectId } } },
    })
    await tx.project.delete({ where: { id: projectId } })
    return true
  })
}

export interface ProjectSettingsPatch {
  autoFormat?: boolean
  defaultDpr?: number
  defaultFit?: ProjectFit
  defaultQuality?: number
  maxWidth?: number
  stripMetadata?: boolean
  watermarkEnabled?: boolean
  watermarkMargin?: number
  watermarkOpacity?: number
  watermarkPosition?: WatermarkPosition
  watermarkScale?: number
  watermarkUrl?: string | null
}

export async function updateProjectSettings(
  projectId: string,
  patch: ProjectSettingsPatch,
  orgId: string,
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
      watermarkEnabled: patch.watermarkEnabled ?? p.watermarkEnabled,
      watermarkUrl:
        patch.watermarkUrl === undefined ? p.watermarkUrl : patch.watermarkUrl,
      watermarkPosition: patch.watermarkPosition ?? p.watermarkPosition,
      watermarkOpacity: patch.watermarkOpacity ?? p.watermarkOpacity,
      watermarkScale: patch.watermarkScale ?? p.watermarkScale,
      watermarkMargin: patch.watermarkMargin ?? p.watermarkMargin,
    },
  })
  return toProject(updated)
}
