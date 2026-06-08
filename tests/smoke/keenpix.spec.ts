import { expect, test } from '@playwright/test'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'
import { PrismaClient } from '../../src/generated/prisma/client'

const DATABASE_URL = process.env.DATABASE_URL
const ADMIN_EMAIL = process.env.KEENPIX_SUPER_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.KEENPIX_SUPER_ADMIN_PASSWORD
const APP_DASHBOARD_RE = /\/app\/dashboard/
const LOGIN_RE = /\/login/
const TITLE_RE = /Keenpix|Self-hosted Keenpix/
const ORG_ID = 'org_default'
const ORIGIN_HOST = 'httpbin.org'
const ORIGIN_IMAGE = 'https://httpbin.org/image/png'

function makePrisma() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required for smoke tests.')
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: DATABASE_URL }),
  })
}

test('public pages and health endpoint respond', async ({ page, request }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(TITLE_RE)

  await page.goto('/docs')
  await expect(
    page.getByRole('heading', { exact: true, name: 'Keenpix' }),
  ).toBeVisible()

  const health = await request.get('/api/health')
  expect([200, 503]).toContain(health.status())
  const body = await health.json()
  expect(body.service).toBe('keenpix')
  expect(body.checks).toHaveProperty('cache')
  expect(body.checks).toHaveProperty('transformQueue')
})

test('dashboard is auth-gated and accepts seeded admin credentials', async ({
  page,
}) => {
  if (!(ADMIN_EMAIL && ADMIN_PASSWORD)) {
    test.skip(
      true,
      'Set KEENPIX_SUPER_ADMIN_EMAIL and KEENPIX_SUPER_ADMIN_PASSWORD.',
    )
    return
  }

  await page.goto('/app/dashboard?range=30d')
  await expect(page).toHaveURL(LOGIN_RE)

  const login = await page.request.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(login.ok()).toBe(true)

  await page.goto('/app/dashboard?range=30d')
  await expect(page).toHaveURL(APP_DASHBOARD_RE)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

test('transform endpoint rejects private origins and serves allowlisted public origins', async ({
  request,
}) => {
  const prisma = makePrisma()
  const projectId = `smoke_${Date.now()}`

  await prisma.org.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'Keenpix' },
  })
  await prisma.project.create({
    data: {
      id: projectId,
      orgId: ORG_ID,
      name: 'Smoke test',
      origin: `https://${ORIGIN_HOST}`,
      env: 'test',
      allowedOrigins: [ORIGIN_HOST],
    },
  })

  try {
    const blockedSource = 'https://example.com/not-allowed'
    const blocked = await request.get(
      `/img/${blockedSource}?project=${projectId}&w=32&fmt=webp`,
    )
    expect(blocked.status()).toBe(403)

    const optimized = await request.get(
      `/img/${ORIGIN_IMAGE}?project=${projectId}&w=32&fmt=webp`,
    )
    expect(optimized.status()).toBe(200)
    expect(optimized.headers()['content-type']).toContain('image/webp')
    expect((await optimized.body()).byteLength).toBeGreaterThan(0)
  } finally {
    await prisma.project
      .delete({ where: { id: projectId } })
      .catch(() => undefined)
    await prisma.$disconnect()
  }
})
