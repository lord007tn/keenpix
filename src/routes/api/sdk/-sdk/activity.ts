import { createApiKeyActivity } from '@/actions/admin/api-keys'
import { getClientIp } from './request-url'

export interface SdkApiActivityContext {
  apiKeyId?: string
  projectId?: string
  scope?: 'all_projects' | 'project'
}

export async function addSdkApiActivity(
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
      latencyMs: Math.round(performance.now() - startedAt),
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? undefined,
    })
  } catch {
    return
  }
}
