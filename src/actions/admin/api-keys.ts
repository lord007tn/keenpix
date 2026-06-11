import type { z } from 'zod'
import {
  countApiKeyActivities,
  createApiKeyActivity as createApiKeyActivityInDb,
  disableInternalApiKey,
  listApiKeyActivities,
  type NewApiKeyActivity,
} from '@/data-access/admin/api-keys'
import { auth } from '@/lib/auth/server'
import { ACTIVITY_PAGE_SIZE } from '@/schemas/admin'
import type { createApiKeySchema } from '@/schemas/api-keys'
import {
  INTERNAL_API_KEY_CONFIG,
  INTERNAL_API_KEY_PERMISSIONS,
} from './constants'

export async function listApiKeyActivitiesPage(page: number) {
  const safePage = Math.max(1, page)
  const [activities, total] = await Promise.all([
    listApiKeyActivities(
      INTERNAL_API_KEY_CONFIG,
      (safePage - 1) * ACTIVITY_PAGE_SIZE,
      ACTIVITY_PAGE_SIZE,
    ),
    countApiKeyActivities(INTERNAL_API_KEY_CONFIG),
  ])
  return { activities, total }
}

export function createApiKey(
  input: z.output<typeof createApiKeySchema> & { userId: string },
) {
  return auth.api.createApiKey({
    body: {
      configId: INTERNAL_API_KEY_CONFIG,
      name: input.name,
      userId: input.userId,
      permissions: INTERNAL_API_KEY_PERMISSIONS,
      metadata: input.projectId ? { projectId: input.projectId } : null,
    },
  })
}

export function disableApiKey(id: string) {
  return disableInternalApiKey(id, INTERNAL_API_KEY_CONFIG)
}

export function createApiKeyActivity(input: NewApiKeyActivity) {
  return createApiKeyActivityInDb(input)
}
