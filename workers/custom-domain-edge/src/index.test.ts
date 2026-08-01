import { describe, expect, it } from 'vitest'
import worker, { createOriginRequest } from './index'

const env = {
  APP_ORIGIN: 'https://keenpix.com',
  EDGE_SECRET: 'a-secure-edge-secret-that-is-long-enough',
}

describe('custom-domain edge Worker', () => {
  it('routes a customer hostname to the fixed app origin', () => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source?q=80'),
      env,
    )

    expect(result.url).toBe(
      'https://keenpix.com/img/source?q=80&__keenpix_edge_host=images.customer.com',
    )
    expect(result.headers.get('x-keenpix-custom-host')).toBe(
      'images.customer.com',
    )
    expect(result.headers.get('x-keenpix-edge-secret')).toBe(env.EDGE_SECRET)
  })

  it('overwrites spoofed edge headers', () => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source', {
        headers: {
          'x-keenpix-custom-host': 'victim.test',
          'x-keenpix-edge-secret': 'forged',
        },
      }),
      env,
    )

    expect(result.headers.get('x-keenpix-custom-host')).toBe(
      'images.customer.com',
    )
    expect(result.headers.get('x-keenpix-edge-secret')).toBe(env.EDGE_SECRET)
  })

  it('does not forward customer credentials or cookies to the app origin', () => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source', {
        headers: {
          accept: 'image/avif',
          authorization: 'Bearer customer-secret',
          cookie: 'session=customer-session',
        },
      }),
      env,
    )

    expect(result.headers.get('accept')).toBe('image/avif')
    expect(result.headers.has('authorization')).toBe(false)
    expect(result.headers.has('cookie')).toBe(false)
  })

  it('rejects methods that cannot be image reads', async () => {
    const response = await worker.fetch(
      new Request('https://images.customer.com/img/source', {
        method: 'POST',
      }),
      env,
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, HEAD')
  })
})
