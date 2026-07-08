import { z } from 'zod'
import { analyticsRangeSchema, nonEmptyStringSchema } from './common'

const staffRoleSchema = z.enum(['admin', 'staff'])

const ZONE_ID_PATTERN = /^[a-f0-9]{32}$/i

export const createInvitationSchema = z.object({
  email: z.email('Enter a valid email address.'),
  expiresDays: z.number().int().min(1).max(30).optional(),
  role: staffRoleSchema,
  sendEmail: z.boolean(),
})

export const invitationTokenSchema = z.object({
  token: z.string().min(20),
})

export const acceptInvitationSchema = z.object({
  name: z
    .string()
    .trim()
    .max(80, 'Use 80 characters or fewer.')
    .transform((value) => value || undefined),
  password: z.string().min(8, 'Use at least 8 characters.'),
  token: z.string().min(20),
})

export const revokeInvitationSchema = z.object({
  id: nonEmptyStringSchema(),
})

export const cloudflareSettingsSchema = z.object({
  apiToken: z.string().trim().max(200, 'Use 200 characters or fewer.'),
  enabled: z.boolean(),
  host: z.string().trim().max(255, 'Use 255 characters or fewer.'),
  zoneId: z
    .string()
    .trim()
    .refine((value) => value === '' || ZONE_ID_PATTERN.test(value), {
      message: 'Zone ID is a 32-character hex string.',
    }),
})

export const cacheMaintenanceSchema = z.object({
  target: z.enum(['all', 'disk', 'memory']),
})

export const resourceTrendSchema = z.object({
  range: analyticsRangeSchema.catch('24h'),
})

export const operationsConfigSchema = z.object({
  diskCacheMaxMb: z.coerce
    .number()
    .int('Use a whole number.')
    .min(16, 'Use at least 16 MB.')
    .max(1_048_576, 'Use 1048576 MB (1 TB) or fewer.'),
  memoryCacheMaxMb: z.coerce
    .number()
    .int('Use a whole number.')
    .min(0, 'Use 0 or more (0 disables the memory cache).')
    .max(65_536, 'Use 65536 MB (64 GB) or fewer.'),
})

export const ACTIVITY_PAGE_SIZE = 10

export const apiActivityPageSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
})

export type CreateInvitationInput = z.input<typeof createInvitationSchema>
export type CacheMaintenanceInput = z.input<typeof cacheMaintenanceSchema>
export type CloudflareSettingsFormInput = z.input<
  typeof cloudflareSettingsSchema
>
