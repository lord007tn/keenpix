import { z } from 'zod'
import {
  addAllowedHost,
  createProject,
  getProject,
  listProjects,
  removeAllowedHost,
  updateProjectSettings,
} from '@/actions/projects'
import { prewarmProjectImages } from '@/actions/transform'
import {
  allowedHostValueSchema,
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
  projectPrewarmSchema,
} from '@/schemas/projects'
import { isCloud } from '@/server/deployment'
import type { SdkApiActivityContext } from './activity'
import { verifySdkApiKey } from './auth'
import { getPublicBaseUrl } from './request-url'
import { json, jsonError, readJson } from './responses'

// The org the SDK operates in is resolved from the API key itself
// (verifySdkApiKey → access.orgId), so every request is scoped to the key's own
// tenant. Self-host keys map to the single default org; cloud keys carry theirs.

export async function listProjectResources(
  request: Request,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'read', undefined, activity)
  const projects = await listProjects(access.orgId)
  return json({
    projects: access.projectId
      ? projects.filter((project) => project.id === access.projectId)
      : projects,
  })
}

export async function createProjectResource(
  request: Request,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'write', undefined, activity)
  if (access.projectId) {
    return jsonError('API key cannot create projects', 403, {
      code: 'operation_not_allowed',
      resolutionHint:
        'Create projects in the managed dashboard; self-hosted installations may use an all-project write key.',
    })
  }
  const input = internalCreateProjectSchema.parse(await readJson(request))
  const project = await createProject(access.orgId, input)
  return json({ project }, { status: 201 })
}

export async function getProjectResource(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'read', projectId, activity)
  const project = await getProject(access.orgId, projectId)
  return project ? json({ project }) : projectNotFound()
}

export async function getProjectConfiguration(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'read', projectId, activity)
  const project = await getProject(access.orgId, projectId)
  if (!project) {
    return projectNotFound()
  }

  const publicBaseUrl = getPublicBaseUrl(request)
  const cloud = isCloud()
  const deliveryBaseUrl = cloud
    ? `https://cdn.keenpix.com/p/${project.id}`
    : publicBaseUrl
  const projectQuery = cloud ? '' : `?project=${project.id}`

  return json({
    configuration: {
      projectId: project.id,
      projectName: project.name,
      origin: project.origin,
      allowedOrigins: project.allowedOrigins,
      imageBaseUrl: `${deliveryBaseUrl}/img`,
      transformUrlTemplate: `${deliveryBaseUrl}/img/<encoded-source-url>${projectQuery}`,
      watermark: {
        enabled: project.watermarkEnabled,
        margin: project.watermarkMargin,
        opacity: project.watermarkOpacity,
        position: project.watermarkPosition,
        scale: project.watermarkScale,
        url: project.watermarkUrl,
      },
      defaults: {
        autoFormat: project.autoFormat,
        defaultQuality: project.defaultQuality,
        stripMetadata: project.stripMetadata,
        watermarkEnabled: project.watermarkEnabled,
      },
      supportedParameters: [
        ...(cloud ? [] : ['project']),
        'url',
        'w',
        'h',
        'q',
        'fmt',
        'fit',
        'dpr',
        'blur',
        'position',
        'pos',
        'gravity',
        'background',
        'bg',
        'flatten',
        'resize',
        's',
        'enlarge',
        'kernel',
        'extract',
        'crop',
        'trim',
        'extend',
        'extendWith',
        'rotate',
        'r',
        'flip',
        'flop',
        'sharpen',
        'median',
        'gamma',
        'gammaOut',
        'negate',
        'normalize',
        'normalise',
        'threshold',
        'brightness',
        'saturation',
        'hue',
        'lightness',
        'tint',
        'grayscale',
        'greyscale',
        'animated',
        'a',
      ],
    },
  })
}

export async function updateProjectSettingsResource(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'write', projectId, activity)
  const patch = internalProjectSettingsPatchSchema.parse(
    await readJson(request),
  )
  const project = await updateProjectSettings(access.orgId, projectId, patch)
  return project ? json({ project }) : projectNotFound()
}

export async function prewarmProjectImagesResource(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'write', projectId, activity)
  // Ensure the project belongs to the key's org before warming its cache.
  const target = await getProject(access.orgId, projectId)
  if (!target) {
    return projectNotFound()
  }
  const input = projectPrewarmSchema.parse(await readJson(request))
  const sources = [...(input.sources ?? []), ...(input.src ? [input.src] : [])]
  const result = await prewarmProjectImages({
    dpr: input.dpr,
    fit: input.fit,
    formats: input.formats,
    projectId,
    quality: input.quality,
    sources: [...new Set(sources)],
    widths: [...new Set(input.widths)],
  })
  return json(
    {
      prewarm: {
        accepted: true,
        sourceCount: new Set(sources).size,
        variantCount: result.variantCount,
      },
    },
    { status: 202 },
  )
}

export async function addProjectDomain(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'write', projectId, activity)
  const { host } = z
    .object({ host: allowedHostValueSchema })
    .parse(await readJson(request))
  const project = await addAllowedHost(access.orgId, projectId, host)
  return project ? json({ project }) : projectNotFound()
}

export async function removeProjectDomain(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'write', projectId, activity)
  const project = await removeAllowedHost(
    access.orgId,
    projectId,
    await getProjectDomainFromRequest(request),
  )
  return project ? json({ project }) : projectNotFound()
}

function projectNotFound() {
  return jsonError('Project not found', 404, {
    code: 'project_not_found',
    resolutionHint:
      'List projects visible to this API key and retry with one of those project identifiers.',
  })
}

async function getProjectDomainFromRequest(request: Request) {
  const queryHost = new URL(request.url).searchParams.get('host')
  if (queryHost) {
    return allowedHostValueSchema.parse(queryHost)
  }
  const { host } = z
    .object({ host: allowedHostValueSchema })
    .parse(await readJson(request))
  return host
}
