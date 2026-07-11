import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { logger } from '@/lib/logger/logger'
import { isCloud } from '@/server/deployment'

const MAX_BODY_BYTES = 2048
const webVitalSchema = z.object({
  version: z.literal(1),
  name: z.enum(['CLS', 'INP', 'LCP']),
  value: z.number().finite().nonnegative().max(300_000),
  delta: z.number().finite().nonnegative().max(300_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  id: z.string().min(1).max(100),
  navigationType: z.string().min(1).max(32),
  route: z
    .string()
    .startsWith('/')
    .max(200)
    .refine((route) => !route.includes('?')),
  deviceClass: z.enum(['phone', 'tablet', 'desktop']),
  viewport: z.object({
    width: z.number().int().positive().max(20_000),
    height: z.number().int().positive().max(20_000),
  }),
})

export const Route = createFileRoute('/api/web-vitals')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isCloud()) {
          return new Response(null, { status: 404 })
        }

        const requestOrigin = request.headers.get('origin')
        if (requestOrigin !== new URL(request.url).origin) {
          return new Response(null, { status: 403 })
        }

        if (
          !request.headers.get('content-type')?.startsWith('application/json')
        ) {
          return new Response(null, { status: 415 })
        }

        const contentLength = Number(request.headers.get('content-length') ?? 0)
        if (contentLength > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 })
        }

        const body = await request.text()
        if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
          return new Response(null, { status: 413 })
        }

        let json: unknown
        try {
          json = JSON.parse(body)
        } catch {
          return new Response(null, { status: 400 })
        }

        const metric = webVitalSchema.safeParse(json)
        if (!metric.success) {
          return new Response(null, { status: 400 })
        }

        logger.info({ event: 'web_vital', webVital: metric.data }, 'web vital')
        return new Response(null, {
          headers: { 'cache-control': 'no-store' },
          status: 204,
        })
      },
    },
  },
})
