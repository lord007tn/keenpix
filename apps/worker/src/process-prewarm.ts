import type { PrewarmTransformJob } from '@keenpix/queue'

export function createPrewarmProcessor({
  appUrl,
  secret,
  timeoutMs,
}: {
  appUrl: string
  secret: string
  timeoutMs: number
}) {
  return async (data: PrewarmTransformJob) => {
    const response = await fetch(
      new URL('/api/internal/transforms/prewarm', appUrl),
      {
        body: JSON.stringify(data),
        headers: {
          authorization: `Bearer ${secret}`,
          'content-type': 'application/json',
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
