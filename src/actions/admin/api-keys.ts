import {
  createApiKeyActivity as createApiKeyActivityInDb,
  type NewApiKeyActivity,
} from '@/data-access/admin/api-keys'

// SDK request-activity logging. API-key management moved to the org-scoped tenant
// surface (src/actions/api-keys.ts); this only records activity for the SDK.
export function createApiKeyActivity(input: NewApiKeyActivity) {
  return createApiKeyActivityInDb(input)
}
