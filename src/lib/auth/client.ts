import { apiKeyClient } from '@better-auth/api-key/client'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { clientEnv } from '@/env/client'

const baseURL =
  clientEnv.VITE_KEENPIX_PUBLIC_URL ||
  clientEnv.VITE_KEENPIX_AUTH_URL ||
  clientEnv.VITE_BETTER_AUTH_URL ||
  (typeof window === 'undefined' ? undefined : window.location.origin)

export const authClient = createAuthClient({
  baseURL,
  plugins: [apiKeyClient(), adminClient()],
})

export const { signIn, signOut, useSession } = authClient
