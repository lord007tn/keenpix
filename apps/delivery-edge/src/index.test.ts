import { describe, expect, it } from 'vitest'
import worker, {
  classifyDelivery,
  createOriginRequest,
  getFirstPartyDelivery,
} from './index'

const env = {
  EDGE_ANALYTICS: { writeDataPoint: () => undefined },
  EDGE_SECRET: 'a-secure-edge-secret-that-is-long-enough',
  FIRST_PARTY_HOSTNAME: 'cdn.keenpix.com',
  TRANSFORM_ORIGIN: 'https://transform.keenpix.com',
} as const

describe('delivery edge Worker', () => {
  it('routes a customer hostname to the fixed transform origin', () => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source?q=80'),
      env,
    )

    expect(result.url).toBe(
      'https://transform.keenpix.com/img/source?q=80&__keenpix_edge_host=images.customer.com',
    )
    expect(result.headers.get('x-keenpix-custom-host')).toBe(
      'images.customer.com',
    )
    expect(result.headers.get('x-keenpix-edge-secret')).toBe(env.EDGE_SECRET)
  })

  it('adds a trusted project hint and rewrites first-party delivery paths', () => {
    const result = createOriginRequest(
      new Request('https://cdn.keenpix.com/p/project_123/img/source?q=80'),
      env,
    )

    expect(result.url).toBe(
      'https://transform.keenpix.com/img/source?q=80&__keenpix_edge_host=cdn.keenpix.com&project=project_123',
    )
    expect(result.headers.get('x-keenpix-edge-project')).toBe('project_123')
    expect(
      getFirstPartyDelivery(
        new URL('https://cdn.keenpix.com/p/project_123/img/source'),
        'cdn.keenpix.com',
      ),
    ).toEqual({ projectId: 'project_123', originPathname: '/img/source' })
    expect(
      getFirstPartyDelivery(
        new URL('https://other.example/p/project_123/img/source'),
        'cdn.keenpix.com',
      ),
    ).toBeUndefined()
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

  it('does not forward customer credentials or cookies to the transform origin', () => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source', {
        headers: {
          accept: 'image/avif',
          authorization: 'Bearer customer-secret',
          cookie: 'session=customer-session',
          'sec-ch-dpr': '2',
          'sec-ch-width': '1280',
        },
      }),
      env,
    )

    expect(result.headers.get('accept')).toBe('image/avif')
    expect(result.headers.get('sec-ch-dpr')).toBe('2')
    expect(result.headers.get('sec-ch-width')).toBe('1280')
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

  it('classifies the mutually exclusive delivery stages', () => {
    expect(classifyDelivery(200, 'hit', 'miss')).toBe('edge')
    expect(classifyDelivery(200, 'miss', 'hit')).toBe('cache')
    expect(classifyDelivery(200, 'miss', 'miss')).toBe('optimized')
    expect(classifyDelivery(404, 'hit', 'hit')).toBe('failed')
  })
})
