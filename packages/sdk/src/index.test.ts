import { describe, expect, it } from 'vitest'
import { createKeenpixClient, KeenpixApiError } from './index'
import { signTransformRequest, signTransformUrl } from './signing'

describe('createKeenpixClient', () => {
  it('normalizes the base URL and authenticates versioned SDK requests', async () => {
    let requestedAuthorization = ''
    let requestedUrl = ''
    const client = createKeenpixClient({
      apiKey: 'secret-key',
      baseUrl: 'https://keenpix.example.com///',
      fetch: (input, init) => {
        requestedUrl = String(input)
        requestedAuthorization =
          new Headers(init?.headers).get('Authorization') ?? ''
        return Promise.resolve(Response.json({ projects: [] }))
      },
    })

    await expect(client.listProjects()).resolves.toEqual([])
    expect(requestedUrl).toBe('https://keenpix.example.com/api/sdk/v1/projects')
    expect(requestedAuthorization).toBe('Bearer secret-key')
  })

  it('surfaces the response status and error body', async () => {
    const client = createKeenpixClient({
      apiKey: 'secret-key',
      baseUrl: 'https://keenpix.example.com',
      fetch: () =>
        Promise.resolve(Response.json({ error: 'Denied' }, { status: 403 })),
    })

    await expect(client.listProjects()).rejects.toEqual(
      new KeenpixApiError(403, { error: 'Denied' }),
    )
  })
})

describe('signTransformUrl', () => {
  it('signs an expiring key-versioned transform URL', () => {
    const signed = new URL(
      signTransformUrl(
        'https://images.example.com/img?url=https%3A%2F%2Fcdn.example.com%2Fa.jpg&w=auto',
        'secret',
        { expiresAt: Date.now() + 300_000, keyVersion: 2 },
      ),
    )
    expect(signed.searchParams.get('kid')).toBe('2')
    expect(signed.searchParams.get('iat')).toBeTruthy()
    expect(signed.searchParams.get('exp')).toBeTruthy()
    expect(signed.searchParams.get('sig')).toBeTruthy()
  })

  it('signs managed project attribution without serializing a project query', () => {
    const src = 'https://cdn.example.com/a.jpg'
    const signed = new URL(
      signTransformUrl(
        `https://cdn.keenpix.com/p/project_1/img/${encodeURIComponent(src)}?w=800`,
        'secret',
        { signatureParams: { project: 'project_1' }, src },
      ),
    )
    const verificationParams = new URLSearchParams(signed.searchParams)
    verificationParams.set('project', 'project_1')

    expect(signed.searchParams.has('project')).toBe(false)
    expect(signed.searchParams.get('sig')).toBe(
      signTransformRequest('secret', src, verificationParams),
    )
  })
})
