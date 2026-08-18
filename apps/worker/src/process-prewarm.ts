import type { PrewarmTransformJob } from '@keenpix/bullmq'

export function createPrewarmProcessor({
  transformUrl,
  secret,
  timeoutMs,
}: {
  transformUrl: string
  secret: string
  timeoutMs: number
}) {
  return async (data: PrewarmTransformJob) => {
    const response = await fetch(
      new URL('/v1/transforms/prewarm', transformUrl),
      {
        body: JSON.stringify(data),
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/json',
          'x-correlation-id': data.correlationId,
        },
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
      },
    )
    if (!response.ok) {
      throw new Error(
        `Prewarm transform failed with HTTP ${response.status}: ${await response.text()}`,
      )
    }
  }
}
