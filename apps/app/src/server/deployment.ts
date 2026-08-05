import { env } from '@/env/server'
import { REPOSITORY_URL } from '@/shared/repository'

const TRAILING_SLASH = /\/$/

// The single deployment switch. `cloud` enables the multi-tenant hosted product
// (self-signup, billing, quotas, marketing surface); anything else (the default)
// is single-tenant self-host. A missing or malformed value always resolves to the
// safe self-host path. Self-host is simply `!isCloud()` — there is no separate
// flag.
export function isCloud() {
  return env.KEENPIX_MODE === 'cloud'
}

export function getAppUrl() {
  if (
    env.NODE_ENV === 'production' &&
    isCloud() &&
    !env.KEENPIX_APP_URL &&
    !env.BETTER_AUTH_URL
  ) {
    throw new Error(
      'Set KEENPIX_APP_URL or BETTER_AUTH_URL for hosted cloud production metadata.',
    )
  }

  return (
    env.KEENPIX_APP_URL ||
    env.BETTER_AUTH_URL ||
    'http://localhost:3000'
  ).replace(TRAILING_SLASH, '')
}

export function getRepositoryUrl() {
  return REPOSITORY_URL
}
