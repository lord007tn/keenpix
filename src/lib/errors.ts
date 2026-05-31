export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong',
): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      message?: unknown
      error?: unknown
      issues?: unknown
    }

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message
    }

    if (typeof maybeError.error === 'string' && maybeError.error.trim()) {
      return maybeError.error
    }

    if (Array.isArray(maybeError.issues)) {
      const firstIssue = maybeError.issues.find(
        (issue): issue is { message?: unknown } =>
          typeof issue === 'object' && issue !== null && 'message' in issue,
      )
      if (
        firstIssue &&
        typeof firstIssue.message === 'string' &&
        firstIssue.message.trim()
      ) {
        return firstIssue.message
      }
    }
  }

  return fallback
}
