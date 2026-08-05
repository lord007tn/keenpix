import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { optimizeProjectImage } from '@/actions/transform'
import { env } from '@/env/server'
import { errorContext, logger } from '@/lib/logger/logger'

const prewarmJobSchema = z.object({
  accept: z.string(),
  params: z.record(z.string(), z.string()),
  projectId: z.string().min(1),
  src: z.url(),
})

export async function handlePrewarmTransform(request: Request) {
  const secret = env.KEENPIX_WORKER_SECRET
  if (!secret) {
    return new Response('Not found', { status: 404 })
  }
  if (request.headers.get('authorization')?.trim() !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const input = prewarmJobSchema.parse(await request.json())
    await optimizeProjectImage({
      accept: input.accept,
      projectId: input.projectId,
      recordLog: false,
      searchParams: new URLSearchParams(input.params),
      src: input.src,
      trusted: true,
    })
    return new Response(null, { status: 204 })
  } catch (error) {
    logger.error(errorContext(error), 'worker prewarm transform failed')
    return new Response('Prewarm transform failed', { status: 500 })
  }
}

export const Route = createFileRoute('/api/internal/transforms/prewarm')({
  server: {
    handlers: {
      POST: ({ request }: { request: Request }) =>
        handlePrewarmTransform(request),
    },
  },
})
