import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import {
  addAllowedOrigin,
  createProject,
  getProject,
  listProjects,
  removeAllowedOrigin,
  updateProjectSettings,
} from '@/data-access/projects'
import { auth } from '@/lib/auth/server'
import {
  allowedHostValueSchema,
  internalCreateProjectSchema,
  internalProjectSettingsPatchSchema,
} from '@/schemas/projects'

const DEFAULT_ORG = 'org_default'
const INTERNAL_API_KEY_CONFIG = 'internal'
const FORWARDED_PAIR_RE = /\s*([^=;\s]+)=("[^"]+"|[^;\s]+)\s*/g
const INVALID_FORWARDED_HOST_RE = /[\s/?#\\]/
const OUTER_QUOTES_RE = /^"|"$/g
const TRAILING_COLON_RE = /:$/

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

  try {
    if (segments[0] !== 'projects') {
      return jsonError('Not found', 404)
    }

    if (segments.length === 1) {
      return await handleProjectsCollection(request, method)
    }

    if (segments.length === 2) {
      return await handleProjectResource(request, method, segments[1])
    }

    if (segments.length === 3 && segments[2] === 'configuration') {
      return await handleProjectConfiguration(request, method, segments[1])
    }

    if (segments.length === 3 && segments[2] === 'settings') {
      return await handleProjectSettings(request, method, segments[1])
    }

    if (segments.length === 3 && segments[2] === 'domains') {
      return await handleProjectDomains(request, method, segments[1])
    }

    return jsonError('Not found', 404)
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    if (error instanceof z.ZodError) {
      return jsonError(error.issues[0]?.message ?? 'Invalid request body', 400)
    }
    if (error instanceof SyntaxError) {
      return jsonError('Invalid JSON request body', 400)
    }
    return jsonError('SDK API request failed', 500)
  }
}

async function handleProjectsCollection(request: Request, method: string) {
  if (method === 'GET') {
    const access = await requireApiKey(request, 'read')
    const projects = await listProjects(DEFAULT_ORG)
    return json({
      projects: access.projectId
        ? projects.filter((project) => project.id === access.projectId)
        : projects,
    })
  }

  if (method === 'POST') {
    const access = await requireApiKey(request, 'write')
    if (access.projectId) {
      return jsonError('API key cannot create projects', 403)
    }
    const input = internalCreateProjectSchema.parse(await readJson(request))
    const project = await createProject({ orgId: DEFAULT_ORG, ...input })
    return json({ project }, { status: 201 })
  }

  return jsonError('Not found', 404)
}

async function handleProjectResource(
  request: Request,
  method: string,
  projectId: string,
) {
  if (method !== 'GET') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'read', projectId)
  const project = await getProject(projectId, DEFAULT_ORG)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

async function handleProjectConfiguration(
  request: Request,
  method: string,
  projectId: string,
) {
  if (method !== 'GET') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'read', projectId)
  const project = await getProject(projectId, DEFAULT_ORG)
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
) {
  if (method !== 'PATCH') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'write', projectId)
  const patch = internalProjectSettingsPatchSchema.parse(
    await readJson(request),
  )
  const project = await updateProjectSettings(projectId, patch, DEFAULT_ORG)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

async function handleProjectDomains(
  request: Request,
  method: string,
  projectId: string,
) {
  if (method === 'POST') {
    await requireApiKey(request, 'write', projectId)
    const { host } = z
      .object({ host: allowedHostValueSchema })
      .parse(await readJson(request))
    const project = await addAllowedOrigin(projectId, host, DEFAULT_ORG)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  if (method === 'DELETE') {
    await requireApiKey(request, 'write', projectId)
    const host = await readHostFromRequest(request)
    const project = await removeAllowedOrigin(projectId, host, DEFAULT_ORG)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  return jsonError('Not found', 404)
}

async function requireApiKey(
  request: Request,
  permission: 'read' | 'write',
  projectId?: string,
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
