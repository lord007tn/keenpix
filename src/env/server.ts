import { createEnv } from '@t3-oss/env-core'
import { serverEnvSchema } from '@/schemas/env'

export const env = createEnv({
  server: serverEnvSchema,
  clientPrefix: 'VITE_',
  client: {},
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  isServer: true,
})
