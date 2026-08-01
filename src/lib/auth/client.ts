import { apiKeyClient } from '@better-auth/api-key/client'
import { polarClient } from '@polar-sh/better-auth'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { clientEnv } from '@/env/client'

const baseURL =
  clientEnv.VITE_KEENPIX_PUBLIC_URL ||
  clientEnv.VITE_KEENPIX_AUTH_URL ||
  clientEnv.VITE_BETTER_AUTH_URL ||
  (typeof window === 'undefined' ? undefined : window.location.origin)

export const authClient = createAuthClient({
  baseURL,
  // polarClient adds checkout/customer-portal actions; the matching server
  // endpoints only exist in cloud (buildPolarPlugin), so self-host never calls
  // them — the billing UI that does is cloud-gated.
  plugins: [apiKeyClient(), adminClient(), organizationClient(), polarClient()],
})

export const { signOut } = authClient
