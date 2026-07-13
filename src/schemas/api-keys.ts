import { z } from 'zod'
import { nonEmptyStringSchema } from './common'

export const createApiKeySchema = z.object({
  name: nonEmptyStringSchema('Enter an API key name.').max(
    80,
    'Use 80 characters or fewer.',
  ),
  projectId: z.string(),
})

export const apiKeyWorkspaceSchema = z.object({
  projectId: z.string(),
})

export const apiKeyActivityPageSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  projectId: z.string(),
})

export const disableApiKeySchema = z.object({
  id: nonEmptyStringSchema(),
})

export type CreateApiKeyInput = z.input<typeof createApiKeySchema>
