import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createApiKeyActivity } from '@/actions/admin'
import {
  addAllowedHost,
  createProject,
  getProject,
  listProjects,
  removeAllowedHost,
  updateProjectSettings,
} from '@/actions/projects'
import { auth } from '@/lib/auth/server'
import {
  allowedHostValueSchema,
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
} from '@/schemas/projects'

const INTERNAL_API_KEY_CONFIG = 'internal'
const FORWARDED_PAIR_RE = /\s*([^=;\s]+)=("[^"]+"|[^;\s]+)\s*/g
const INVALID_FORWARDED_HOST_RE = /[\s/?#\\]/
const OUTER_QUOTES_RE = /^"|"$/g
const TRAILING_COLON_RE = /:$/

interface SdkApiActivityContext {
  apiKeyId?: string
  projectId?: string
  scope?: 'all_projects' | 'project'
}

export const Route = createFileRoute('/api/sdk/$')({
  server: {
    handlers: {
      DELETE: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'DELETE'),
      GET: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'GET'),
      PATCH: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'PATCH'),
      POST: ({ params, request }) =>
        handleSdkRequest(request, params._splat, 'POST'),
    },
  },
})

async function handleSdkRequest(
  request: Request,
  splat: string | undefined,
  method: string,
) {
  const segments = (splat ?? '').split('/').filter(Boolean)
  const activity: SdkApiActivityContext = {}
  const startedAt = performance.now()
  let response: Response | undefined

  try {
    if (segments[0] !== 'projects') {
      response = jsonError('Not found', 404)
      return response
    }

    if (segments.length === 1) {
      response = await handleProjectsCollection(request, method, activity)
      return response
    }

    if (segments.length === 2) {
      response = await handleProjectResource(
        request,
        method,
        segments[1],
        activity,
      )
      return response
    }

    if (segments.length === 3 && segments[2] === 'configuration') {
      response = await handleProjectConfiguration(
        request,
        method,
        segments[1],
        activity,
      )
      return response
    }

    if (segments.length === 3 && segments[2] === 'settings') {
      response = await handleProjectSettings(
        request,
        method,
        segments[1],
        activity,
      )
      return response
    }

    if (segments.length === 3 && segments[2] === 'domains') {
      response = await handleProjectDomains(
        request,
        method,
        segments[1],
        activity,
      )
      return response
    }

    response = jsonError('Not found', 404)
    return response
  } catch (error) {
    if (error instanceof Response) {
      response = error
      return error
    }
    if (error instanceof z.ZodError) {
      response = jsonError(
        error.issues[0]?.message ?? 'Invalid request body',
        400,
      )
      return response
    }
    if (error instanceof SyntaxError) {
      response = jsonError('Invalid JSON request body', 400)
      return response
    }
    response = jsonError('SDK API request failed', 500)
    return response
  } finally {
    await recordSdkApiActivity(request, activity, response, startedAt)
  }
}

async function handleProjectsCollection(
  request: Request,
  method: string,
  activity: SdkApiActivityContext,
) {
  if (method === 'GET') {
    const access = await requireApiKey(request, 'read', undefined, activity)
    const projects = await listProjects()
    return json({
      projects: access.projectId
        ? projects.filter((project) => project.id === access.projectId)
        : projects,
    })
  }

  if (method === 'POST') {
    const access = await requireApiKey(request, 'write', undefined, activity)
    if (access.projectId) {
      return jsonError('API key cannot create projects', 403)
    }
    const input = internalCreateProjectSchema.parse(await readJson(request))
    const project = await createProject(input)
    return json({ project }, { status: 201 })
  }

  return jsonError('Not found', 404)
}

async function handleProjectResource(
  request: Request,
  method: string,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  if (method !== 'GET') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'read', projectId, activity)
  const project = await getProject(projectId)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

async function handleProjectConfiguration(
  request: Request,
  method: string,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  if (method !== 'GET') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'read', projectId, activity)
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

async function handleProjectSettings(
  request: Request,
  method: string,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  if (method !== 'PATCH') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'write', projectId, activity)
  const patch = internalProjectSettingsPatchSchema.parse(
    await readJson(request),
  )
  const project = await updateProjectSettings(projectId, patch)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

async function handleProjectDomains(
  request: Request,
  method: string,
  projectId: string,
  activity: SdkApiActivityContext,
) {
  if (method === 'POST') {
    await requireApiKey(request, 'write', projectId, activity)
    const { host } = z
      .object({ host: allowedHostValueSchema })
      .parse(await readJson(request))
    const project = await addAllowedHost(projectId, host)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  if (method === 'DELETE') {
    await requireApiKey(request, 'write', projectId, activity)
    const host = await readHostFromRequest(request)
    const project = await removeAllowedHost(projectId, host)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  return jsonError('Not found', 404)
}

async function requireApiKey(
  request: Request,
  permission: 'read' | 'write',
  projectId?: string,
  activity?: SdkApiActivityContext,
) {
  const key = getApiKey(request)
  if (!key) {
    throw jsonError('Missing API key', 401)
  }

  const result = await auth.api.verifyApiKey({
    body: {
      configId: INTERNAL_API_KEY_CONFIG,
      key,
      permissions: { projects: [permission] },
    },
  })

  if (result.valid) {
    const access = getApiKeyAccess(result.key)
    const apiKeyId = getApiKeyId(result.key)
    if (activity && apiKeyId) {
      activity.apiKeyId = apiKeyId
      activity.projectId = projectId ?? access.projectId
      activity.scope = access.projectId ? 'project' : 'all_projects'
    }
    if (access.projectId && projectId && access.projectId !== projectId) {
      throw jsonError('API key cannot access this project', 403)
    }
    return access
  }

  const status = result.error?.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401
  const message =
    typeof result.error?.message === 'string'
      ? result.error.message
      : 'Invalid API key'
  throw jsonError(message, status)
}

async function recordSdkApiActivity(
  request: Request,
  activity: SdkApiActivityContext,
  response: Response | undefined,
  startedAt: number,
) {
  if (!activity.apiKeyId) {
    return
  }

  try {
    const url = new URL(request.url)
    await createApiKeyActivity({
      apiKeyId: activity.apiKeyId,
      method: request.method,
      path: url.pathname,
      status: response?.status ?? 500,
      projectId: activity.projectId,
      scope: activity.scope ?? 'all_projects',
      latencyMs: performance.now() - startedAt,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    })
  } catch {
    return
  }
}

function getApiKeyAccess(key: unknown) {
  if (!(key && typeof key === 'object')) {
    return {}
  }

  const metadata = Reflect.get(key, 'metadata')
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const projectId = Reflect.get(metadata, 'projectId')
    return typeof projectId === 'string' && projectId.trim()
      ? { projectId: projectId.trim() }
      : {}
  }

  if (typeof metadata === 'string' && metadata.trim()) {
    try {
      return getApiKeyAccess({ metadata: JSON.parse(metadata) })
    } catch {
      return {}
    }
  }

  return {}
}

function getApiKeyId(key: unknown) {
  if (!(key && typeof key === 'object')) {
    return
  }
  const id = Reflect.get(key, 'id')
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}

async function readHostFromRequest(request: Request) {
  const queryHost = new URL(request.url).searchParams.get('host')
  if (queryHost) {
    return allowedHostValueSchema.parse(queryHost)
  }
  const { host } = z
    .object({ host: allowedHostValueSchema })
    .parse(await readJson(request))
  return host
}

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    undefined
  )
}

function getApiKey(request: Request) {
  const authorization = request.headers.get('authorization')?.trim()
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }
  return request.headers.get('x-keenpix-api-key')?.trim()
}

function getPublicBaseUrl(request: Request) {
  const requestUrl = new URL(request.url)
  const forwarded = Object.fromEntries(
    [
      ...(request.headers
        .get('forwarded')
        ?.split(',')[0]
        ?.matchAll(FORWARDED_PAIR_RE) ?? []),
    ].map((match) => [
      match[1]?.toLowerCase() ?? '',
      match[2]?.trim().replace(OUTER_QUOTES_RE, '') ?? '',
    ]),
  )
  const proto = (
    request.headers.get('x-forwarded-proto')?.split(',')[0] ??
    forwarded.proto ??
    requestUrl.protocol
  )
    .trim()
    .toLowerCase()
    .replace(OUTER_QUOTES_RE, '')
    .replace(TRAILING_COLON_RE, '')
  const host = (
    request.headers.get('x-forwarded-host')?.split(',')[0] ??
    forwarded.host ??
    requestUrl.host
  )
    .trim()
    .replace(OUTER_QUOTES_RE, '')

  if (
    (proto !== 'http' && proto !== 'https') ||
    !host ||
    INVALID_FORWARDED_HOST_RE.test(host)
  ) {
    return requestUrl.origin
  }

  try {
    return new URL(`${proto}://${host}`).origin
  } catch {
    return requestUrl.origin
  }
}

async function readJson(request: Request) {
  const text = await request.text()
  if (!text.trim()) {
    return {}
  }
  return JSON.parse(text)
}

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    headers: { 'cache-control': 'no-store', ...init?.headers },
    status: init?.status,
  })
}

function jsonError(message: string, status: number) {
  return json({ error: message }, { status })
}
