import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

const optionalUrl = z.string().url().optional()

export const clientEnv = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_KEENPIX_PUBLIC_URL: optionalUrl,
    VITE_KEENPIX_AUTH_URL: optionalUrl,
    VITE_BETTER_AUTH_URL: optionalUrl,
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
  isServer: typeof window === 'undefined',
})
