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
const ORIGIN_HOST = 'placehold.co'
const ORIGIN_IMAGE = 'https://placehold.co/32x32'

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
  await expect(
    page
      .getByRole('heading', { name: 'Dashboard' })
      .or(page.getByText('Create your first project')),
  ).toBeVisible()
})

test('project setup creates an allowlisted transform flow', async ({
  page,
  request,
}) => {
  if (!(ADMIN_EMAIL && ADMIN_PASSWORD)) {
    test.skip(
      true,
      'Set KEENPIX_SUPER_ADMIN_EMAIL and KEENPIX_SUPER_ADMIN_PASSWORD.',
    )
    return
  }

  const prisma = makePrisma()
  const projectName = `Smoke project ${Date.now()}`
  let projectId = ''

  const login = await page.request.post('/api/auth/sign-in/email', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(login.ok()).toBe(true)

  try {
    await page.goto('/app/dashboard?range=30d')
    // The dashboard SSRs before React handlers are attached; this dev-only
    // control appears after the client runtime is interactive.
    await page
      .getByRole('button', { name: 'Open TanStack Devtools' })
      .waitFor({ state: 'visible' })
    await page.getByRole('button', { name: 'New project' }).click()
    await expect(
      page.getByRole('heading', { name: 'New project' }),
    ).toBeVisible()

    await page.getByLabel('Name').fill(projectName)
    await page.getByLabel('Origin URL').fill(`https://${ORIGIN_HOST}`)
    await page.getByRole('button', { name: 'Create project' }).click()
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 15_000 })

    const project = await prisma.project.findFirst({
      where: { name: projectName, orgId: ORG_ID },
    })
    if (!project) {
      throw new Error('Created smoke project was not found.')
    }
    projectId = project.id
    expect(project.allowedOrigins).toContain(ORIGIN_HOST)

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
    if (projectId) {
      await prisma.project
        .delete({ where: { id: projectId } })
        .catch(() => undefined)
    } else {
      await prisma.project.deleteMany({ where: { name: projectName } })
    }
    await prisma.$disconnect()
  }
})
