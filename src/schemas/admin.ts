import { z } from 'zod'
import { analyticsRangeSchema, nonEmptyStringSchema } from './common'

const staffRoleSchema = z.enum(['admin', 'staff'])
const internalPlanSchema = z.enum(['none', 'basic', 'pro', 'business'])

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

export const cacheMaintenanceSchema = z.object({
  target: z.enum(['all', 'disk', 'memory']),
})

export const resourceTrendSchema = z.object({
  range: analyticsRangeSchema.catch('24h'),
})

export const platformAnalyticsSchema = z.object({
  range: analyticsRangeSchema.catch('30d'),
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

export const customerAccountSchema = z.object({
  orgId: nonEmptyStringSchema(),
})

export const customerAnalyticsSchema = z.object({
  orgId: nonEmptyStringSchema(),
  range: analyticsRangeSchema.catch('30d'),
})

export const updateInternalPlanGrantSchema = z.object({
  orgId: nonEmptyStringSchema(),
  plan: internalPlanSchema,
  reason: z.string().trim().max(500, 'Use 500 characters or fewer.').optional(),
  // Optional YYYY-MM-DD expiry; empty/omitted = no expiry (permanent grant).
  expiresAt: z.string().optional(),
})

export const suspendOrgSchema = z.object({
  orgId: nonEmptyStringSchema(),
  suspended: z.boolean(),
  reason: z.string().trim().max(500, 'Use 500 characters or fewer.').optional(),
})

export type CreateInvitationInput = z.input<typeof createInvitationSchema>
export type CacheMaintenanceInput = z.input<typeof cacheMaintenanceSchema>
export type UpdateInternalPlanGrantInput = z.input<
  typeof updateInternalPlanGrantSchema
>
