import { createEnv } from '@t3-oss/env-core'
import { clientEnvSchema } from '@/schemas/env'

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: clientEnvSchema,
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
  isServer: typeof window === 'undefined',
})
