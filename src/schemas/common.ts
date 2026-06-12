import { z } from 'zod'

export const analyticsRangeSchema = z.enum(['24h', '7d', '30d', '90d'])

export const optionalUrlSchema = z.url().optional()

export const nonEmptyStringSchema = (message = 'This field is required.') =>
  z.string().trim().min(1, message)

export const optionalNonEmptyParamSchema = z.preprocess(
  (value) => (typeof value === 'string' && value ? value : undefined),
  z.string().optional(),
)

export const stringArrayParamSchema = z.preprocess(
  (value) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : undefined,
  z.array(z.string()).optional(),
)
