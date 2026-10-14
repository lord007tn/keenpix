import { createServerEntry } from '@tanstack/react-start/server'
import { H3 } from 'nitro/h3'
import { describe, expect, it, vi } from 'vitest'
import { handleDocumentRequest } from './document-request'

const canonicalOrigin = 'https://keenpix.example'

describe('stable Start custom document entry', () => {
  it.each([
    401, 429, 503,
  ])('preserves an endpoint-specific %s response and both cookies', async (status) => {
    const headers = new Headers({ 'content-type': 'application/json' })
    headers.append('set-cookie', 'session=synthetic; Path=/; HttpOnly')
    headers.append('set-cookie', 'preference=synthetic; Path=/')
    const endpointResponse = new Response(
      JSON.stringify({ code: 'endpoint_error' }),
      { headers, status },
    )
    const entry = createServerEntry({
      fetch: (request) =>
        handleDocumentRequest({
          canonicalOrigin,
          loadMarkdown: vi.fn(),
          request,
          route: () => Promise.resolve(endpointResponse),
        }),
    })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/api/auth/get-session`),
    )

    expect(response).toBe(endpointResponse)
    expect(response.status).toBe(status)
    expect(response.headers.getSetCookie()).toHaveLength(2)
    expect(await response.json()).toEqual({ code: 'endpoint_error' })
  })

  it('lets Start recover a thrown Response without replacing its payload', async () => {
    const endpointResponse = Response.json(
      { code: 'permission_denied' },
      { status: 403, headers: { 'x-endpoint': 'synthetic' } },
    )
    const entry = createServerEntry({
      fetch: (request) =>
        handleDocumentRequest({
          canonicalOrigin,
          loadMarkdown: vi.fn(),
          request,
          route: () => Promise.reject(endpointResponse),
        }),
    })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/api/sdk/v1/projects`),
    )

    expect(response.status).toBe(403)
    expect(response.headers.get('x-endpoint')).toBe('synthetic')
    expect(await response.json()).toEqual({ code: 'permission_denied' })
  })

  it.each([
    undefined,
    null,
    false,
    0,
    '',
  ])('converts a falsy Markdown-loader failure (%s) to a generic 500', async (error) => {
    const route = vi.fn()
    const entry = createServerEntry({
      fetch: (request) =>
        handleDocumentRequest({
          canonicalOrigin,
          loadMarkdown: () => Promise.reject(error),
          request,
          route,
        }),
    })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/docs`, {
        headers: { accept: 'text/markdown' },
      }),
    )

    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({
      message: 'HTTPError',
      status: 500,
      unhandled: true,
    })
    expect(route).not.toHaveBeenCalled()
  })

  it('retains an error status without disclosing its message', async () => {
    const entry = createServerEntry({
      fetch: (request) =>
        handleDocumentRequest({
          canonicalOrigin,
          loadMarkdown: () =>
            Promise.reject({ status: 422, message: 'private loader detail' }),
          request,
          route: vi.fn(),
        }),
    })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/docs.md`),
    )

    expect(response.status).toBe(422)
    expect(await response.text()).not.toContain('private loader detail')
  })

  it.each([
    204, 205, 304, 308,
  ])('keeps a bodyless %s response and its protocol headers during HTML discovery', async (status) => {
    const headers = new Headers({ location: '/docs/getting-started' })
    headers.append('set-cookie', 'first=synthetic; Path=/')
    headers.append('set-cookie', 'second=synthetic; Path=/')
    const entry = createServerEntry({
      fetch: (request) =>
        handleDocumentRequest({
          canonicalOrigin,
          loadMarkdown: vi.fn(),
          request,
          route: async () => new Response(null, { headers, status }),
        }),
    })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/docs`, {
        headers: { accept: 'text/html' },
      }),
    )

    expect(response.status).toBe(status)
    expect(response.body).toBeNull()
    expect(response.headers.get('location')).toBe('/docs/getting-started')
    expect(response.headers.getSetCookie()).toHaveLength(2)
    expect(response.headers.get('link')).toContain('/docs.md')
  })

  it('rejects malformed percent encoding before the custom entry runs', async () => {
    const fetch = vi.fn(async () => new Response('should not run'))
    const entry = createServerEntry({ fetch })

    const response = await entry.fetch(
      new Request(`${canonicalOrigin}/%E0%A4%A`),
    )

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    '/%E0%A4%A',
    '/%ZZ',
    '/%C0%AF',
  ])('rejects %s at the Nitro adapter before reaching Start', async (pathname) => {
    const fetch = vi.fn(async () => new Response('should not run'))
    const entry = createServerEntry({ fetch })
    const app = new H3().all('/**', (event) => entry.fetch(event.req))

    const response = await app.fetch(
      new Request(`${canonicalOrigin}${pathname}`),
    )

    expect(response.status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
})
