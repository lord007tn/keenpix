import { z } from 'zod'
import { nonEmptyStringSchema } from './common'

export const createApiKeySchema = z.object({
  name: nonEmptyStringSchema('Enter an API key name.').max(
    80,
    'Use 80 characters or fewer.',
  ),
  projectId: z.string(),
})

export const disableApiKeySchema = z.object({
  id: nonEmptyStringSchema(),
})

export type CreateApiKeyInput = z.input<typeof createApiKeySchema>
