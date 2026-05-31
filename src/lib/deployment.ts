const TRAILING_SLASH = /\/$/

export function isSelfHosted() {
  return (
    process.env.KEENPIX_SELF_HOST === 'true' ||
    process.env.KEENPIX_SELF_HOST === '1'
  )
}

export function getAppUrl() {
  if (
    process.env.NODE_ENV === 'production' &&
    !isSelfHosted() &&
    !process.env.KEENPIX_APP_URL &&
    !process.env.BETTER_AUTH_URL
  ) {
    throw new Error(
      'Set KEENPIX_APP_URL or BETTER_AUTH_URL for hosted production metadata.',
    )
  }

  return (
    process.env.KEENPIX_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    'http://localhost:3000'
  ).replace(TRAILING_SLASH, '')
}

export function getRepositoryUrl() {
  return 'https://github.com/lord007tn/keenpix'
}
