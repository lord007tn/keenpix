import { z } from 'zod'
import {
  analyticsRangeSchema,
  nonEmptyStringSchema,
  optionalNonEmptyParamSchema,
  stringArrayParamSchema,
} from './common'

export const analyticsInputSchema = z.object({
  domain: stringArrayParamSchema,
  format: stringArrayParamSchema,
  project: optionalNonEmptyParamSchema,
  range: analyticsRangeSchema.catch('24h'),
  status: stringArrayParamSchema,
})

export const dashboardInputSchema = z.object({
  project: optionalNonEmptyParamSchema,
  range: analyticsRangeSchema.catch('24h'),
})

export const allowedHostStatsSchema = z.object({
  projectId: nonEmptyStringSchema(),
  range: analyticsRangeSchema.catch('30d'),
})

export type AnalyticsInput = z.input<typeof analyticsInputSchema>
export type DashboardInput = z.input<typeof dashboardInputSchema>
