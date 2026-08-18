export class TransformError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'TransformError'
  }
}

export function getTransformErrorStatus(error: unknown) {
  return error instanceof TransformError ? error.status : 500
}

export function getPublicTransformErrorMessage(error: unknown) {
  return error instanceof TransformError
    ? error.message
    : 'Image transform failed'
}
