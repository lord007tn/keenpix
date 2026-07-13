import { getOrgApiKeyAccess } from '@/actions/api-keys'
import { DEFAULT_ORG_ID } from '@/lib/auth/active-org'
import { auth } from '@/lib/auth/server'
import { isCloud } from '@/server/deployment'
import type { SdkApiActivityContext } from './activity'
import { jsonError } from './responses'

const INTERNAL_API_KEY_CONFIG = 'internal'

export interface SdkApiKeyAccess {
  orgId: string
  projectId?: string
}

export async function verifySdkApiKey(
  request: Request,
  permission: 'read' | 'write',
  projectId?: string,
  activity?: SdkApiActivityContext,
): Promise<SdkApiKeyAccess> {
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
    const apiKeyId = getApiKeyId(result.key)
    const scope = apiKeyId ? await getOrgApiKeyAccess(apiKeyId) : null
    const legacyAccess = getApiKeyAccess(result.key)
    // Resolve the org the key belongs to. Self-host legacy keys (no orgId) map to
    // the single default org; a cloud key MUST carry its own orgId — there is no
    // shared-tenant fallback, so an unattributed cloud key is rejected. Every
    // downstream lookup is org-scoped, so a key can only ever touch its own org.
    const orgId = scope?.orgId ?? (isCloud() ? undefined : DEFAULT_ORG_ID)
    if (!orgId) {
      throw jsonError('API key is not associated with an organization', 403)
    }
    if (isCloud() && !scope?.projectId) {
      throw jsonError('API key is not associated with a project', 403)
    }
    if (activity && apiKeyId) {
      activity.apiKeyId = apiKeyId
      activity.projectId = projectId ?? scope?.projectId ?? undefined
      activity.scope = scope?.projectId ? 'project' : 'all_projects'
    }
    if (scope?.projectId && projectId && scope.projectId !== projectId) {
      throw jsonError('API key cannot access this project', 403)
    }
    return {
      orgId,
      projectId:
        scope?.projectId ?? (isCloud() ? undefined : legacyAccess.projectId),
    }
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

function readMetadata(key: unknown): unknown {
  if (!(key && typeof key === 'object')) {
    return null
  }
  let metadata = Reflect.get(key, 'metadata')
  for (let i = 0; i < 2; i++) {
    if (typeof metadata !== 'string') {
      break
    }
    try {
      metadata = JSON.parse(metadata)
    } catch {
      return null
    }
  }
  return metadata
}

function getApiKeyAccess(key: unknown): { orgId?: string; projectId?: string } {
  const metadata = readMetadata(key)
  if (!(metadata && typeof metadata === 'object' && !Array.isArray(metadata))) {
    return {}
  }
  const orgId = Reflect.get(metadata, 'orgId')
  const projectId = Reflect.get(metadata, 'projectId')
  return {
    orgId: typeof orgId === 'string' && orgId.trim() ? orgId.trim() : undefined,
    projectId:
      typeof projectId === 'string' && projectId.trim()
        ? projectId.trim()
        : undefined,
  }
}

function getApiKeyId(key: unknown) {
  if (!(key && typeof key === 'object')) {
    return
  }
  const id = Reflect.get(key, 'id')
  return typeof id === 'string' && id.trim() ? id.trim() : undefined
}
