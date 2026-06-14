// Dev-only demo data so the dashboard / analytics / logs / API activity have
// something to render. Idempotent: it wipes and re-creates only its own demo
// projects + API key, never touching real data. Run: pnpm tsx scripts/seed-demo.ts
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('Set DATABASE_URL before seeding demo data.')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL }),
})

const ORG_ID = 'org_default'
const DEMO_KEY_ID = 'demo_internal_key'
const DAY = 86_400_000

const PROJECTS = [
  {
    id: 'demo_shop',
    name: 'Demo Shop',
    origin: 'https://shop.demo.example',
    color1: '#FF6B2C',
    color2: '#FFA76B',
    allowedOrigins: ['cdn.shop.demo', 'img.shop.demo', 'assets.shop.demo'],
  },
  {
    id: 'demo_blog',
    name: 'Demo Blog',
    origin: 'https://blog.demo.example',
    color1: '#3A7BD5',
    color2: '#5DE3CE',
    allowedOrigins: ['media.blog.demo', 'cdn.blog.demo'],
  },
]

const FORMATS = ['avif', 'webp', 'jpeg', 'png']
const STATUSES = [200, 200, 200, 200, 304, 304, 404, 500]
// Weighted so a couple of countries dominate, with one '' (Unknown) for the
// edge-header-absent case the geo card has to handle.
const COUNTRIES = [
  'US',
  'US',
  'US',
  'SA',
  'SA',
  'GB',
  'DE',
  'FR',
  'IN',
  'BR',
  '',
]
const PATHS = [
  '/products/hero.jpg',
  '/products/gallery-1.jpg',
  '/banners/spring-sale.png',
  '/avatars/user-42.webp',
  '/posts/cover.jpg',
]

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const int = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

async function main() {
  console.log('Seeding demo data...')

  await prisma.org.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'Keenpix' },
  })

  for (const p of PROJECTS) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        origin: p.origin,
        allowedOrigins: p.allowedOrigins,
        color1: p.color1,
        color2: p.color2,
      },
      create: { ...p, orgId: ORG_ID },
    })

    // Fresh window of request logs for this project.
    await prisma.requestLog.deleteMany({ where: { projectId: p.id } })
    const now = Date.now()
    const logs = Array.from({ length: 320 }, () => {
      const cached = Math.random() < 0.62
      // The source image fetched from the origin, and the (much smaller)
      // optimized payload keenpix actually delivers — keeping deliveries a small
      // fraction of the original is the whole product, so it must show up as a
      // real positive "bandwidth saved" KPI. A cache hit serves the optimized
      // bytes from disk without re-fetching the origin (bytesIn 0), but still
      // saved the difference vs the original on this delivery.
      const original = int(180_000, 1_400_000)
      const optimized = Math.round(original * (0.12 + Math.random() * 0.18))
      const saved = Math.max(0, original - optimized)
      return {
        orgId: ORG_ID,
        projectId: p.id,
        ts: new Date(now - Math.floor(Math.random() * 7 * DAY)),
        path: pick(PATHS),
        sourceHost: pick(p.allowedOrigins),
        country: pick(COUNTRIES),
        width: pick([320, 640, 800, 1200, 1600]),
        quality: pick([60, 70, 75, 82]),
        format: pick(FORMATS),
        status: pick(STATUSES),
        cached,
        latencyMs: cached ? int(2, 18) : int(40, 320),
        bytesIn: cached ? 0 : original,
        bytesOut: optimized,
        bytesSaved: saved,
      }
    })
    await prisma.requestLog.createMany({ data: logs })

    // The analytics + overview pages read exclusively from the hourly rollups,
    // not from RequestLog. Production maintains them incrementally inside
    // createRequestLog, but this seed inserts logs directly — so rebuild the
    // project's rollups from its freshly-seeded logs (same aggregation as the
    // migration backfill) or the dashboards would render empty.
    await prisma.analyticsRollupHourly.deleteMany({
      where: { projectId: p.id },
    })
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AnalyticsRollupHourly" (
         "id", "bucketStart", "orgId", "projectId", "sourceHost", "country",
         "path", "format", "status", "requests", "cachedRequests",
         "optimizedRequests", "bytesIn", "bytesOut", "bytesSaved", "latencyMsSum",
         "latencyLe5", "latencyLe10", "latencyLe20", "latencyLe35", "latencyLe55",
         "latencyLe80", "latencyLe120", "latencyLe180", "latencyLe260",
         "latencyLe380", "latencyLe540", "latencyLe800", "latencyLe1100",
         "latencyGt1100", "updatedAt"
       )
       SELECT
         md5(concat_ws('|',
           date_trunc('hour', "ts")::text, "orgId", "projectId",
           coalesce("sourceHost", ''), coalesce("country", ''), "path", "format",
           "status"::text)),
         date_trunc('hour', "ts"), "orgId", "projectId",
         coalesce("sourceHost", ''), coalesce("country", ''), "path", "format",
         "status",
         count(*)::int,
         count(*) FILTER (WHERE "cached")::int,
         count(*) FILTER (WHERE NOT "cached")::int,
         coalesce(sum("bytesIn"), 0)::bigint,
         coalesce(sum("bytesOut"), 0)::bigint,
         coalesce(sum("bytesSaved"), 0)::bigint,
         coalesce(sum("latencyMs"), 0)::double precision,
         count(*) FILTER (WHERE "latencyMs" <= 5)::int,
         count(*) FILTER (WHERE "latencyMs" > 5 AND "latencyMs" <= 10)::int,
         count(*) FILTER (WHERE "latencyMs" > 10 AND "latencyMs" <= 20)::int,
         count(*) FILTER (WHERE "latencyMs" > 20 AND "latencyMs" <= 35)::int,
         count(*) FILTER (WHERE "latencyMs" > 35 AND "latencyMs" <= 55)::int,
         count(*) FILTER (WHERE "latencyMs" > 55 AND "latencyMs" <= 80)::int,
         count(*) FILTER (WHERE "latencyMs" > 80 AND "latencyMs" <= 120)::int,
         count(*) FILTER (WHERE "latencyMs" > 120 AND "latencyMs" <= 180)::int,
         count(*) FILTER (WHERE "latencyMs" > 180 AND "latencyMs" <= 260)::int,
         count(*) FILTER (WHERE "latencyMs" > 260 AND "latencyMs" <= 380)::int,
         count(*) FILTER (WHERE "latencyMs" > 380 AND "latencyMs" <= 540)::int,
         count(*) FILTER (WHERE "latencyMs" > 540 AND "latencyMs" <= 800)::int,
         count(*) FILTER (WHERE "latencyMs" > 800 AND "latencyMs" <= 1100)::int,
         count(*) FILTER (WHERE "latencyMs" > 1100)::int,
         CURRENT_TIMESTAMP
       FROM "RequestLog"
       WHERE "projectId" = $1
       GROUP BY
         date_trunc('hour', "ts"), "orgId", "projectId",
         coalesce("sourceHost", ''), coalesce("country", ''), "path", "format",
         "status"`,
      p.id,
    )
    console.log(`  ${p.name}: ${logs.length} request logs + hourly rollups`)
  }

  // Internal API key + a page-able stream of activity.
  await prisma.apiKey.upsert({
    where: { id: DEMO_KEY_ID },
    update: { enabled: true },
    create: {
      id: DEMO_KEY_ID,
      configId: 'internal',
      name: 'Demo Integration',
      prefix: 'kpx',
      start: 'demo',
      key: 'demo-hashed-key',
      referenceId: 'demo-ref',
      enabled: true,
    },
  })
  await prisma.apiKeyActivity.deleteMany({ where: { apiKeyId: DEMO_KEY_ID } })
  const methods = ['GET', 'POST', 'PATCH', 'DELETE']
  const apiPaths = [
    '/api/sdk/projects',
    '/api/sdk/projects/demo_shop',
    '/api/sdk/projects/demo_blog/domains',
  ]
  const now = Date.now()
  const activity = Array.from({ length: 37 }, (_, i) => ({
    apiKeyId: DEMO_KEY_ID,
    method: pick(methods),
    path: pick(apiPaths),
    status: pick([200, 200, 201, 204, 400, 404]),
    projectId: Math.random() < 0.5 ? pick(PROJECTS).id : null,
    scope: Math.random() < 0.5 ? 'project' : 'all_projects',
    latencyMs: int(5, 120),
    createdAt: new Date(now - i * 90_000),
  }))
  await prisma.apiKeyActivity.createMany({ data: activity })
  console.log(`  Demo Integration: ${activity.length} API activities`)

  console.log('Demo data ready.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
