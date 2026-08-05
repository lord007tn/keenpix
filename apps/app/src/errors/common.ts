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
    const directMessage =
      nonEmptyString(Reflect.get(error, 'message')) ??
      nonEmptyString(Reflect.get(error, 'error'))
    if (directMessage) {
      return directMessage
    }

    const issueMessage = firstIssueMessage(Reflect.get(error, 'issues'))
    if (issueMessage) {
      return issueMessage
    }
  }

  return fallback
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function firstIssueMessage(value: unknown) {
  if (!Array.isArray(value)) {
    return
  }
  for (const issue of value) {
    if (typeof issue !== 'object' || issue === null) {
      continue
    }
    const message = nonEmptyString(Reflect.get(issue, 'message'))
    if (message) {
      return message
    }
  }
}
