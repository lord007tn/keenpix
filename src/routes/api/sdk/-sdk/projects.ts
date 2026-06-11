import { z } from 'zod'
import {
  addAllowedHost,
  createProject,
  getProject,
  listProjects,
  removeAllowedHost,
  updateProjectSettings,
} from '@/actions/projects'
import {
  allowedHostValueSchema,
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
} from '@/schemas/projects'
import type { SdkApiActivityContext } from './activity'
import { verifySdkApiKey } from './auth'
import { getPublicBaseUrl } from './request-url'
import { json, jsonError, readJson } from './responses'

export async function listProjectResources(
  request: Request,
  activity: SdkApiActivityContext,
) {
  const access = await verifySdkApiKey(request, 'read', undefined, activity)
  const projects = await listProjects()
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
    return jsonError('API key cannot create projects', 403)
  }
  const input = internalCreateProjectSchema.parse(await readJson(request))
  const project = await createProject(input)
  return json({ project }, { status: 201 })
}

export async function getProjectResource(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  await verifySdkApiKey(request, 'read', projectId, activity)
  const project = await getProject(projectId)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

export async function getProjectConfiguration(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  await verifySdkApiKey(request, 'read', projectId, activity)
  const project = await getProject(projectId)
  if (!project) {
    return jsonError('Project not found', 404)
  }

  const publicBaseUrl = getPublicBaseUrl(request)

  return json({
    configuration: {
      projectId: project.id,
      projectName: project.name,
      origin: project.origin,
      allowedOrigins: project.allowedOrigins,
      imageBaseUrl: `${publicBaseUrl}/img`,
      transformUrlTemplate: `${publicBaseUrl}/img/<source-url>?project=${project.id}`,
      defaults: {
        autoFormat: project.autoFormat,
        defaultQuality: project.defaultQuality,
        stripMetadata: project.stripMetadata,
      },
      supportedParameters: [
        'project',
        'url',
        'w',
        'h',
        'q',
        'fmt',
        'fit',
        'dpr',
        'blur',
      ],
    },
  })
}

export async function updateProjectSettingsResource(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  await verifySdkApiKey(request, 'write', projectId, activity)
  const patch = internalProjectSettingsPatchSchema.parse(
    await readJson(request),
  )
  const project = await updateProjectSettings(projectId, patch)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

export async function addProjectDomain(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  await verifySdkApiKey(request, 'write', projectId, activity)
  const { host } = z
    .object({ host: allowedHostValueSchema })
    .parse(await readJson(request))
  const project = await addAllowedHost(projectId, host)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

export async function removeProjectDomain(
  request: Request,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  await verifySdkApiKey(request, 'write', projectId, activity)
  const project = await removeAllowedHost(
    projectId,
    await getProjectDomainFromRequest(request),
  )
  return project ? json({ project }) : jsonError('Project not found', 404)
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
