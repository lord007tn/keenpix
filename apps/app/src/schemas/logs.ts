import { z } from 'zod'
import {
  historicalAnalyticsRangeSchema,
  optionalNonEmptyParamSchema,
  stringArrayParamSchema,
  validateHistoricalWindow,
} from './common'

export const logsQuerySchema = z
  .object({
    cache: stringArrayParamSchema,
    domain: stringArrayParamSchema,
    format: stringArrayParamSchema,
    from: z.iso.date().optional(),
    project: optionalNonEmptyParamSchema,
    range: historicalAnalyticsRangeSchema.catch('24h'),
    search: optionalNonEmptyParamSchema,
    status: stringArrayParamSchema,
    to: z.iso.date().optional(),
  })
  .superRefine(validateHistoricalWindow)
