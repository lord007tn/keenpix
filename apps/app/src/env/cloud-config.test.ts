import { afterEach, describe, expect, it, vi } from 'vitest'

// Exercises the createFinalSchema cloud block in ./server: KEENPIX_MODE=cloud
// must require the full hosted stack (DB, auth secret, email provider, Polar,
// cron secret) so a cloud deploy can't boot green with billing/signup dead.
const CLOUD_KEYS = [
  'KEENPIX_MODE',
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'KEENPIX_APP_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_PROVIDER',
  'POSTMARK_API_KEY',
  'POSTMARK_FROM',
  'POLAR_TOKEN',
  'POLAR_SERVER',
  'POLAR_WEBHOOK_SECRET',
  'POLAR_SANDBOX_WEBHOOK_SECRET',
  'CRON_SECRET',
  'CLOUDFLARE_SAAS_API_TOKEN',
  'CLOUDFLARE_SAAS_ZONE_ID',
  'CLOUDFLARE_SAAS_CNAME_TARGET',
  'CLOUDFLARE_SAAS_WORKER_SCRIPT',
  'CLOUDFLARE_SAAS_EDGE_SECRET',
]

const FULL_CLOUD_ENV = {
  KEENPIX_MODE: 'cloud',
  DATABASE_URL: 'postgresql://localhost/keenpix',
  BETTER_AUTH_SECRET: 'a'.repeat(48),
  EMAIL_PROVIDER: 'postmark',
  POSTMARK_API_KEY: 'token',
  POSTMARK_FROM: 'Keenpix <no-reply@keenpix.com>',
  POLAR_TOKEN: 'polar_oat_x',
  POLAR_SERVER: 'production',
  POLAR_WEBHOOK_SECRET: 'whsec_x',
  CRON_SECRET: 'cron-x',
}

const silence = () => undefined

async function loadEnv(overrides: Record<string, string>) {
  vi.resetModules()
  for (const key of CLOUD_KEYS) {
    delete process.env[key]
  }
  Object.assign(process.env, overrides)
  return (await import('./server')).env
}

describe('cloud config env validation', () => {
  afterEach(() => {
    for (const key of CLOUD_KEYS) {
      delete process.env[key]
    }
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('rejects KEENPIX_MODE=cloud with none of the required config', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(loadEnv({ KEENPIX_MODE: 'cloud' })).rejects.toThrow()
  })

  it('rejects cloud missing only POLAR_TOKEN', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    const { POLAR_TOKEN, ...partial } = FULL_CLOUD_ENV
    await expect(loadEnv(partial)).rejects.toThrow()
  })

  it('accepts a fully-configured cloud env', async () => {
    const env = await loadEnv(FULL_CLOUD_ENV)
    expect(env.KEENPIX_MODE).toBe('cloud')
    expect(env.EMAIL_PROVIDER).toBe('postmark')
  })

  it('rejects a Google OAuth client without its server-only secret', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(
      loadEnv({
        ...FULL_CLOUD_ENV,
        GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com',
      }),
    ).rejects.toThrow()
  })

  it('accepts Polar sandbox on an isolated cloud staging hostname', async () => {
    const env = await loadEnv({
      ...FULL_CLOUD_ENV,
      KEENPIX_APP_URL: 'https://staging.keenpix.example',
      POLAR_SERVER: 'sandbox',
    })
    expect(env.POLAR_SERVER).toBe('sandbox')
  })

  it('rejects Polar sandbox on the production Keenpix hostname', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(
      loadEnv({
        ...FULL_CLOUD_ENV,
        KEENPIX_APP_URL: 'https://keenpix.com',
        POLAR_SERVER: 'sandbox',
      }),
    ).rejects.toThrow()
  })

  it('rejects reuse of the production secret for the sandbox callback', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(
      loadEnv({
        ...FULL_CLOUD_ENV,
        POLAR_SANDBOX_WEBHOOK_SECRET: FULL_CLOUD_ENV.POLAR_WEBHOOK_SECRET,
      }),
    ).rejects.toThrow()
  })

  it('does not require cloud config in self-host mode', async () => {
    const env = await loadEnv({ KEENPIX_MODE: 'selfhost' })
    expect(env.KEENPIX_MODE).toBe('selfhost')
  })

  it('requires the complete Cloudflare for SaaS edge configuration', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(
      loadEnv({
        ...FULL_CLOUD_ENV,
        CLOUDFLARE_SAAS_API_TOKEN: 'token',
        CLOUDFLARE_SAAS_ZONE_ID: 'zone',
        CLOUDFLARE_SAAS_CNAME_TARGET: 'customers.keenpix.com',
      }),
    ).rejects.toThrow()

    const env = await loadEnv({
      ...FULL_CLOUD_ENV,
      CLOUDFLARE_SAAS_API_TOKEN: 'token',
      CLOUDFLARE_SAAS_ZONE_ID: 'zone',
      CLOUDFLARE_SAAS_CNAME_TARGET: 'customers.keenpix.com',
      CLOUDFLARE_SAAS_EDGE_SECRET: 'a'.repeat(32),
    })
    expect(env.CLOUDFLARE_SAAS_WORKER_SCRIPT).toBe('keenpix-custom-domain-edge')
  })
})
