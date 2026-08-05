import { describe, expect, it } from 'vitest'
import { createKeenpixClient, KeenpixApiError } from './index'

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
