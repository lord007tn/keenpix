import { z } from 'zod'
import { optionalNonEmptyParamSchema, stringArrayParamSchema } from './common'

export const logsProjectSchema = optionalNonEmptyParamSchema

export const logsQuerySchema = z.object({
  cache: stringArrayParamSchema,
  domain: stringArrayParamSchema,
  format: stringArrayParamSchema,
  project: optionalNonEmptyParamSchema,
  search: optionalNonEmptyParamSchema,
  status: stringArrayParamSchema,
})
