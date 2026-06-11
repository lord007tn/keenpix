interface FieldMeta {
  errors: unknown[]
}

function getValidationErrorMessage(error: unknown): string | undefined {
  if (!error) {
    return
  }
  if (typeof error === 'string') {
    return error
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object') {
    const message = Reflect.get(error, 'message')
    const issues = Reflect.get(error, 'issues')

    if (typeof message === 'string') {
      return message
    }
    if (Array.isArray(issues)) {
      const firstIssue = issues[0]
      if (typeof firstIssue === 'object' && firstIssue !== null) {
        const issueMessage = Reflect.get(firstIssue, 'message')
        if (typeof issueMessage === 'string') {
          return issueMessage
        }
      }
    }
  }
  return 'Invalid value.'
}

export function getFieldError(meta: FieldMeta): string | undefined {
  return getValidationErrorMessage(meta.errors[0])
}
