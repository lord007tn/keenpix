import { afterEach, describe, expect, it, vi } from 'vitest'
import worker, {
  classifyDelivery,
  createOriginRequest,
  getFirstPartyDelivery,
} from './index'

const env = {
  APP_ORIGIN: 'https://keenpix.com',
  EDGE_ANALYTICS: { writeDataPoint: () => undefined },
  EDGE_SECRET: 'a-secure-edge-secret-that-is-long-enough',
  FIRST_PARTY_HOSTNAME: 'cdn.keenpix.com',
  TRANSFORM_ORIGIN: 'https://transform.keenpix.com',
} as const

describe('delivery edge Worker', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    new Headers({ referer: 'https://keenpix.com/app/projects?secret=private' }),
    new Headers({ 'x-keenpix-request-purpose': 'operator-test' }),
    new Headers({ purpose: 'prefetch' }),
    new Headers({ 'sec-purpose': 'prerender' }),
  ])('forwards an exclusion bit without private preview context', (headers) => {
    const result = createOriginRequest(
      new Request('https://images.customer.com/img/source', { headers }),
      env,
    )
    expect(result.headers.get('x-keenpix-request-purpose')).toBe('preview')
    expect(result.headers.has('referer')).toBe(false)
    expect(JSON.stringify([...result.headers])).not.toContain('private')
  })

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
      { waitUntil: vi.fn() },
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

  it.each([
    'HIT',
    'MISS',
  ])('counts streamed bytes once when %s responses have no Content-Length', async (cacheStatus) => {
    const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])]
    const origin = new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(chunk)
          }
          controller.close()
        },
      }),
      { headers: { 'cf-cache-status': cacheStatus } },
    )
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(origin))
    const writeDataPoint = vi.fn()
    const waitUntil = vi.fn((task: Promise<unknown>) => task)
    const response = await worker.fetch(
      new Request('https://cdn.keenpix.com/p/project_123/img/source'),
      { ...env, EDGE_ANALYTICS: { writeDataPoint } },
      { waitUntil },
    )

    expect(writeDataPoint).not.toHaveBeenCalled()
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4, 5]),
    )
    await Promise.all(waitUntil.mock.calls.map(([task]) => task))
    expect(writeDataPoint).toHaveBeenCalledOnce()
    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['project_123'],
      blobs: [
        cacheStatus === 'HIT' ? 'edge' : 'optimized',
        cacheStatus.toLowerCase(),
        'cdn.keenpix.com',
        '200',
        '',
      ],
      doubles: [5, 1],
    })
  })

  it('keeps header-based accounting on the fast path', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('image', { headers: { 'content-length': '5' } }),
        ),
    )
    const writeDataPoint = vi.fn()
    const waitUntil = vi.fn()
    const response = await worker.fetch(
      new Request('https://cdn.keenpix.com/p/project_123/img/source'),
      { ...env, EDGE_ANALYTICS: { writeDataPoint } },
      { waitUntil },
    )

    expect(await response.text()).toBe('image')
    expect(writeDataPoint).toHaveBeenCalledOnce()
    expect(writeDataPoint.mock.calls[0][0].doubles).toEqual([5, 1])
    expect(waitUntil).not.toHaveBeenCalled()
  })

  it('does not bill the Content-Length header of a HEAD response', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { headers: { 'content-length': '11546' } }),
        ),
    )
    const writeDataPoint = vi.fn()
    await worker.fetch(
      new Request('https://cdn.keenpix.com/p/project_123/img/source', {
        method: 'HEAD',
      }),
      { ...env, EDGE_ANALYTICS: { writeDataPoint } },
      { waitUntil: vi.fn() },
    )

    expect(writeDataPoint).toHaveBeenCalledOnce()
    expect(writeDataPoint.mock.calls[0][0].doubles).toEqual([0, 1])
  })

  it('records partial streamed bytes once when the reader cancels', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array([1, 2, 3]))
            },
          }),
          { headers: { 'cf-cache-status': 'HIT' } },
        ),
      ),
    )
    const writeDataPoint = vi.fn()
    const waitUntil = vi.fn((task: Promise<unknown>) => task)
    const response = await worker.fetch(
      new Request('https://cdn.keenpix.com/p/project_123/img/source'),
      { ...env, EDGE_ANALYTICS: { writeDataPoint } },
      { waitUntil },
    )
    const reader = response.body?.getReader()
    expect((await reader?.read())?.value).toEqual(new Uint8Array([1, 2, 3]))
    await reader?.cancel('client disconnected')
    await Promise.all(waitUntil.mock.calls.map(([task]) => task))

    expect(writeDataPoint).toHaveBeenCalledOnce()
    expect(writeDataPoint.mock.calls[0][0].doubles).toEqual([3, 1])
  })
})
