import { randomUUID, timingSafeEqual } from 'node:crypto'
import { pingClickhouse } from '@keenpix/clickhouse'
import {
  prewarmTransformSchema,
  TRANSFORM_API_VERSION,
} from '@keenpix/contracts'
import { prisma } from '@keenpix/database'
import { createLogger, runWithLogContext } from '@keenpix/logger'
import dayjs from 'dayjs'
import { Hono } from 'hono'
import { env } from './env'
import { getTransformHealth } from './health'
import {
  handleTransformRequest,
  optimizeProjectImage,
  transformCache,
} from './transform'

const logger = createLogger()
const REQUEST_ID_RE = /^[A-Za-z0-9._:-]{8,128}$/
const BEARER_PREFIX_RE = /^Bearer\s+/i

function authorized(request: Request) {
  const provided = request.headers
    .get('authorization')
    ?.replace(BEARER_PREFIX_RE, '')
  if (!provided) {
    return false
  }
  const actual = Buffer.from(provided)
  const expected = Buffer.from(env.KEENPIX_WORKER_SECRET)
  return (
    actual.byteLength === expected.byteLength &&
    timingSafeEqual(actual, expected)
  )
}

export function createTransformApp() {
  return new Hono()
    .use('*', (context, next) => {
      const requestId = REQUEST_ID_RE.test(
        context.req.header('x-request-id') ?? '',
      )
        ? context.req.header('x-request-id')
        : randomUUID()
      const startedAt = performance.now()
      return runWithLogContext(
        {
          method: context.req.method,
          path: context.req.path,
          requestId,
          service: 'keenpix-transform',
        },
        async () => {
          await next()
          context.header('x-request-id', requestId)
          logger.info(
            {
              durationMs: Math.round(performance.now() - startedAt),
              status: context.res.status,
            },
            'request completed',
          )
        },
      )
    })
    .get('/health/live', (context) =>
      context.json({ status: 'healthy', timestamp: dayjs().toISOString() }),
    )
    .get('/health/ready', async (context) => {
      const health = await getTransformHealth({
        probeCache: transformCache.probe.bind(transformCache),
        probeDatabase: () =>
          prisma.$queryRaw`SELECT 1`.then(
            () => true,
            () => false,
          ),
      })
      return context.json(health, health.status === 'healthy' ? 200 : 503)
    })
    .get('/health', async (context) => {
      const health = await getTransformHealth({
        environment: env.NODE_ENV,
        probeCache: transformCache.probe.bind(transformCache),
        probeClickhouse: pingClickhouse,
        probeDatabase: () =>
          prisma.$queryRaw`SELECT 1`.then(
            () => true,
            () => false,
          ),
      })
      return context.json(
        {
          ...health,
          service: 'keenpix-transform',
          version: TRANSFORM_API_VERSION,
        },
        health.status === 'healthy' ? 200 : 503,
      )
    })
    .post(`/${TRANSFORM_API_VERSION}/transforms/prewarm`, async (context) => {
      if (!authorized(context.req.raw)) {
        return context.text('Unauthorized', 401)
      }
      const parsed = prewarmTransformSchema.safeParse(await context.req.json())
      if (!parsed.success) {
        return context.json({ error: 'Invalid prewarm contract' }, 400)
      }
      await runWithLogContext(
        { correlationId: parsed.data.correlationId },
        () =>
          optimizeProjectImage({
            accept: parsed.data.accept,
            projectId: parsed.data.projectId,
            recordLog: false,
            searchParams: new URLSearchParams(parsed.data.params),
            src: parsed.data.src,
            trusted: true,
          }),
      )
      return context.body(null, 204)
    })
    .get('/img/*', (context) =>
      handleTransformRequest(
        context.req.raw,
        context.req.path.slice('/img/'.length),
      ),
    )
    .on('HEAD', '/img/*', (context) =>
      handleTransformRequest(
        context.req.raw,
        context.req.path.slice('/img/'.length),
      ),
    )
    .onError((error, context) => {
      logger.error({ error }, 'unhandled transform request error')
      return context.json({ error: 'Internal server error' }, 500)
    })
}
