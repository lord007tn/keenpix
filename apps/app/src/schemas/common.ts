import dayjs from 'dayjs'
import { z } from 'zod'

export const analyticsRangeSchema = z.enum(['24h', '7d', '30d', '90d'])

export const historicalAnalyticsRangeSchema = z.enum([
  '24h',
  '7d',
  '30d',
  '90d',
  '365d',
  'all',
  'custom',
])

export function validateHistoricalWindow(
  value: { from?: string; range: string; to?: string },
  ctx: z.RefinementCtx,
) {
  if (value.range !== 'custom') {
    return
  }
  if (!value.from) {
    ctx.addIssue({ code: 'custom', path: ['from'], message: 'Required' })
  }
  if (!value.to) {
    ctx.addIssue({ code: 'custom', path: ['to'], message: 'Required' })
  }
  if (!(value.from && value.to)) {
    return
  }
  const from = dayjs(value.from)
  const to = dayjs(value.to)
  if (from.isAfter(to)) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Must be on or after the start date',
    })
  }
  if (to.diff(from, 'day') > 3650) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Custom windows are limited to 10 years',
    })
  }
  if (to.isAfter(dayjs(), 'day')) {
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Cannot be in the future',
    })
  }
}

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
