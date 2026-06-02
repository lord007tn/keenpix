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

type ProjectPermission = 'read' | 'write'

export const Route = createFileRoute('/api/internal/$')({
  server: {
    handlers: {
      DELETE: ({ params, request }) =>
        handleInternalRequest(request, params._splat, 'DELETE'),
      GET: ({ params, request }) =>
        handleInternalRequest(request, params._splat, 'GET'),
      PATCH: ({ params, request }) =>
        handleInternalRequest(request, params._splat, 'PATCH'),
      POST: ({ params, request }) =>
        handleInternalRequest(request, params._splat, 'POST'),
    },
  },
})

async function handleInternalRequest(
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
    return jsonError('Internal API request failed', 500)
  }
}

async function handleProjectsCollection(request: Request, method: string) {
  if (method === 'GET') {
    await requireApiKey(request, 'read')
    return json({ projects: await listProjects(DEFAULT_ORG) })
  }

  if (method === 'POST') {
    await requireApiKey(request, 'write')
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

  await requireApiKey(request, 'read')
  const project = await getProject(projectId, DEFAULT_ORG)
  return project ? json({ project }) : jsonError('Project not found', 404)
}

async function handleProjectSettings(
  request: Request,
  method: string,
  projectId: string,
) {
  if (method !== 'PATCH') {
    return jsonError('Not found', 404)
  }

  await requireApiKey(request, 'write')
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
    await requireApiKey(request, 'write')
    const { host } = z
      .object({ host: allowedHostValueSchema })
      .parse(await readJson(request))
    const project = await addAllowedOrigin(projectId, host, DEFAULT_ORG)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  if (method === 'DELETE') {
    await requireApiKey(request, 'write')
    const host = await readHostFromRequest(request)
    const project = await removeAllowedOrigin(projectId, host, DEFAULT_ORG)
    return project ? json({ project }) : jsonError('Project not found', 404)
  }

  return jsonError('Not found', 404)
}

async function requireApiKey(request: Request, permission: ProjectPermission) {
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
    return
  }

  const status = result.error?.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401
  const message =
    typeof result.error?.message === 'string'
      ? result.error.message
      : 'Invalid API key'
  throw jsonError(message, status)
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
