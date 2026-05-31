import { env } from '@/env/server'

const TRAILING_SLASH = /\/$/

export function isSelfHosted() {
  return env.KEENPIX_SELF_HOST === 'true' || env.KEENPIX_SELF_HOST === '1'
}

export function getAppUrl() {
  if (
    env.NODE_ENV === 'production' &&
    !isSelfHosted() &&
    !env.KEENPIX_APP_URL &&
    !env.BETTER_AUTH_URL
  ) {
    throw new Error(
      'Set KEENPIX_APP_URL or BETTER_AUTH_URL for hosted production metadata.',
    )
  }

  return (
    env.KEENPIX_APP_URL ||
    env.BETTER_AUTH_URL ||
    'http://localhost:3000'
  ).replace(TRAILING_SLASH, '')
}

export function getRepositoryUrl() {
  return 'https://github.com/lord007tn/keenpix'
}
