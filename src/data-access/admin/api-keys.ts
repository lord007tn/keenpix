import { prisma } from '@/db'

export interface NewApiKeyActivity {
  apiKeyId: string
  ipAddress?: string
  latencyMs?: number
  method: string
  path: string
  projectId?: string
  scope: 'all_projects' | 'project'
  status: number
  userAgent?: string
}

export async function createApiKeyActivity(input: NewApiKeyActivity) {
  await prisma.apiKeyActivity.create({
    data: {
      apiKeyId: input.apiKeyId,
      method: input.method,
      path: input.path,
      status: input.status,
      projectId: input.projectId ?? null,
      scope: input.scope,
      latencyMs: input.latencyMs ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

export async function disableInternalApiKey(id: string, configId: string) {
  const result = await prisma.apiKey.updateMany({
    where: { id, configId },
    data: { enabled: false },
  })

  if (result.count === 0) {
    throw new Error('API key not found')
  }

  return { ok: true }
}
