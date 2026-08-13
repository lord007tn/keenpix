import { z } from 'zod'

export const TRANSFORM_API_VERSION = 'v1'
export const PREWARM_CONTRACT_VERSION = 1

export const prewarmTransformSchema = z.object({
  accept: z.string(),
  correlationId: z.string().min(1),
  params: z.record(z.string(), z.string()),
  projectId: z.string().min(1),
  requestedAt: z.string().datetime(),
  src: z.url(),
  version: z.literal(PREWARM_CONTRACT_VERSION),
})

export type PrewarmTransformContract = z.infer<typeof prewarmTransformSchema>
