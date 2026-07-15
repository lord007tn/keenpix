import { z } from 'zod'
import {
  analyticsRangeSchema,
  historicalAnalyticsRangeSchema,
  nonEmptyStringSchema,
  optionalNonEmptyParamSchema,
  stringArrayParamSchema,
  validateHistoricalWindow,
} from './common'

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
  .superRefine(validateHistoricalWindow)

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
