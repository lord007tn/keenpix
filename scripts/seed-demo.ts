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
      const bytesIn = int(40_000, 900_000)
      const bytesOut = Math.round(bytesIn * (0.18 + Math.random() * 0.4))
      return {
        orgId: ORG_ID,
        projectId: p.id,
        ts: new Date(now - Math.floor(Math.random() * 7 * DAY)),
        path: pick(PATHS),
        sourceHost: pick(p.allowedOrigins),
        width: pick([320, 640, 800, 1200, 1600]),
        quality: pick([60, 70, 75, 82]),
        format: pick(FORMATS),
        status: pick(STATUSES),
        cached,
        latencyMs: cached ? int(2, 18) : int(40, 320),
        bytesIn: cached ? 0 : bytesIn,
        bytesOut,
      }
    })
    await prisma.requestLog.createMany({ data: logs })
    console.log(`  ${p.name}: ${logs.length} request logs`)
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
