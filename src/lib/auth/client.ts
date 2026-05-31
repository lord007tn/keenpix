import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

const baseURL =
  import.meta.env.VITE_KEENPIX_PUBLIC_URL ||
  import.meta.env.VITE_KEENPIX_AUTH_URL ||
  import.meta.env.VITE_BETTER_AUTH_URL ||
  (typeof window === 'undefined' ? undefined : window.location.origin)

export const authClient = createAuthClient({
  baseURL,
  plugins: [adminClient()],
})

export const { signIn, signOut, useSession } = authClient
