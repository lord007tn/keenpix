import { apiKeyClient } from '@better-auth/api-key/client'
import { polarClient } from '@polar-sh/better-auth'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export function createKeenpixAuthClient(baseURL?: string) {
  return createAuthClient({
    baseURL,
    plugins: [
      apiKeyClient(),
      adminClient(),
      organizationClient(),
      polarClient(),
    ],
  })
}
