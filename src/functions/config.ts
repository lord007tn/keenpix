import { createServerFn } from '@tanstack/react-start'
import { getPublicConfig } from '@/actions/config'

// Public config used by the landing route before an authenticated app session
// exists. Self-hosted deployments skip the marketing site.
export const getPublicConfigFn = createServerFn({ method: 'GET' }).handler(() =>
  getPublicConfig(),
)
