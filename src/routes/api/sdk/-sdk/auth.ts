import { auth } from '@/lib/auth/server'
import type { SdkApiActivityContext } from './activity'
import { jsonError } from './responses'

const INTERNAL_API_KEY_CONFIG = 'internal'

export async function verifySdkApiKey(
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

function getApiKey(request: Request) {
  const authorization = request.headers.get('authorization')?.trim()
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }
  return request.headers.get('x-keenpix-api-key')?.trim()
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
