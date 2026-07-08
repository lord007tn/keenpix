import { afterEach, describe, expect, it, vi } from 'vitest'

// Exercises the createFinalSchema cloud block in ./server: KEENPIX_MODE=cloud
// must require the full hosted stack (DB, auth secret, email provider, Polar,
// cron secret) so a cloud deploy can't boot green with billing/signup dead.
const CLOUD_KEYS = [
  'KEENPIX_MODE',
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'EMAIL_PROVIDER',
  'POSTMARK_API_KEY',
  'POSTMARK_FROM',
  'POLAR_TOKEN',
  'POLAR_WEBHOOK_SECRET',
  'CRON_SECRET',
]

const FULL_CLOUD_ENV = {
  KEENPIX_MODE: 'cloud',
  DATABASE_URL: 'postgresql://localhost/keenpix',
  BETTER_AUTH_SECRET: 'a'.repeat(48),
  EMAIL_PROVIDER: 'postmark',
  POSTMARK_API_KEY: 'token',
  POSTMARK_FROM: 'Keenpix <no-reply@keenpix.com>',
  POLAR_TOKEN: 'polar_oat_x',
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

  it('does not require cloud config in self-host mode', async () => {
    const env = await loadEnv({ KEENPIX_MODE: 'selfhost' })
    expect(env.KEENPIX_MODE).toBe('selfhost')
  })
})
