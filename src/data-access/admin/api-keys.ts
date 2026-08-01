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
