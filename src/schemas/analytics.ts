import dayjs from 'dayjs'
import { z } from 'zod'
import {
  analyticsRangeSchema,
  nonEmptyStringSchema,
  optionalNonEmptyParamSchema,
  stringArrayParamSchema,
} from './common'

const historicalAnalyticsRangeSchema = z.enum([
  '24h',
  '7d',
  '30d',
  '90d',
  '365d',
  'all',
  'custom',
])

export const analyticsInputSchema = z
  .object({
    domain: stringArrayParamSchema,
    format: stringArrayParamSchema,
    from: z.iso.date().optional(),
    project: optionalNonEmptyParamSchema,
    range: historicalAnalyticsRangeSchema.catch('24h'),
    status: stringArrayParamSchema,
    to: z.iso.date().optional(),
  })
  .superRefine((value, ctx) => {
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
  })

export const dashboardInputSchema = z.object({
  project: optionalNonEmptyParamSchema,
  range: analyticsRangeSchema.catch('24h'),
})

export const edgeCacheStatsSchema = z.object({
  range: analyticsRangeSchema.catch('24h'),
})

export const allowedHostStatsSchema = z.object({
  projectId: nonEmptyStringSchema(),
  range: analyticsRangeSchema.catch('30d'),
})

export type AnalyticsInput = z.input<typeof analyticsInputSchema>
export type DashboardInput = z.input<typeof dashboardInputSchema>
