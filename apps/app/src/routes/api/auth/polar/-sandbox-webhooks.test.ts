import { afterEach, describe, expect, it, vi } from 'vitest'

const validateEvent = vi.hoisted(() => vi.fn())
const sandboxEnv = vi.hoisted(() => ({ secret: 'sandbox-secret' }))

vi.mock('@polar-sh/sdk/webhooks', () => ({ validateEvent }))
vi.mock('@/env/server', () => ({
  env: {
    get POLAR_SANDBOX_WEBHOOK_SECRET() {
      return sandboxEnv.secret
    },
  },
}))

const { handlePolarSandboxWebhook } = await import('./sandbox-webhooks')

function request() {
  return new Request('https://keenpix.com/api/auth/polar/sandbox-webhooks', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'webhook-id': 'sandbox-event-id',
      'webhook-signature': 'v1,signed',
      'webhook-timestamp': '1783900800',
    },
    body: JSON.stringify({ type: 'subscription.created' }),
  })
}

afterEach(() => {
  sandboxEnv.secret = 'sandbox-secret'
  vi.clearAllMocks()
})

describe('Polar sandbox apex webhook sink', () => {
  it('acknowledges a verified event without applying an entitlement', async () => {
    validateEvent.mockReturnValue({ type: 'subscription.created' })

    const response = await handlePolarSandboxWebhook(request())

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      environment: 'sandbox',
      received: true,
      type: 'subscription.created',
    })
    expect(validateEvent).toHaveBeenCalledWith(
      JSON.stringify({ type: 'subscription.created' }),
      {
        'webhook-id': 'sandbox-event-id',
        'webhook-signature': 'v1,signed',
        'webhook-timestamp': '1783900800',
      },
      'sandbox-secret',
    )
  })

  it('rejects invalid signatures and stays disabled without a secret', async () => {
    validateEvent.mockImplementation(() => {
      throw new Error('invalid signature')
    })
    expect((await handlePolarSandboxWebhook(request())).status).toBe(400)

    sandboxEnv.secret = ''
    expect((await handlePolarSandboxWebhook(request())).status).toBe(404)
  })
})
