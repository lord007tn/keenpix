import { afterEach, describe, expect, it, vi } from 'vitest'

// Exercises the createFinalSchema cross-field refine in ./server: selecting an
// email provider must require that provider's credentials at boot.
const EMAIL_KEYS = [
  'EMAIL_PROVIDER',
  'POSTMARK_API_KEY',
  'POSTMARK_FROM',
  'RESEND_API_KEY',
  'RESEND_FROM',
  'SMTP_HOST',
  'SMTP_FROM_EMAIL',
]

// createEnv logs to console.error before throwing on invalid env; silence it so
// the expected-failure tests don't spam the reporter.
const silence = () => undefined

async function loadEnv(overrides: Record<string, string>) {
  vi.resetModules()
  for (const key of EMAIL_KEYS) {
    delete process.env[key]
  }
  Object.assign(process.env, overrides)
  return (await import('./server')).env
}

describe('email provider env validation', () => {
  afterEach(() => {
    for (const key of EMAIL_KEYS) {
      delete process.env[key]
    }
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('loads with no provider selected (email disabled)', async () => {
    const env = await loadEnv({})
    expect(env.EMAIL_PROVIDER).toBeUndefined()
  })

  it('rejects EMAIL_PROVIDER=postmark without Postmark credentials', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(loadEnv({ EMAIL_PROVIDER: 'postmark' })).rejects.toThrow()
  })

  it('accepts EMAIL_PROVIDER=postmark with credentials', async () => {
    const env = await loadEnv({
      EMAIL_PROVIDER: 'postmark',
      POSTMARK_API_KEY: 'token',
      POSTMARK_FROM: 'Keenpix <no-reply@keenpix.com>',
    })
    expect(env.EMAIL_PROVIDER).toBe('postmark')
  })

  it('rejects EMAIL_PROVIDER=resend without Resend credentials', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(loadEnv({ EMAIL_PROVIDER: 'resend' })).rejects.toThrow()
  })

  it('rejects EMAIL_PROVIDER=smtp without SMTP host + sender', async () => {
    vi.spyOn(console, 'error').mockImplementation(silence)
    await expect(loadEnv({ EMAIL_PROVIDER: 'smtp' })).rejects.toThrow()
  })

  it('accepts EMAIL_PROVIDER=smtp with host + sender', async () => {
    const env = await loadEnv({
      EMAIL_PROVIDER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_FROM_EMAIL: 'keenpix@example.com',
    })
    expect(env.EMAIL_PROVIDER).toBe('smtp')
  })
})
