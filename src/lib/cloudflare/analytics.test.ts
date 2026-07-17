import { describe, expect, it, vi } from 'vitest'

const { json, post } = vi.hoisted(() => ({
  json: vi.fn(),
  post: vi.fn(),
}))

vi.mock('got', () => ({ default: { post } }))

post.mockReturnValue({ json })

const { verifyCloudflareAccess } = await import('./analytics')

const settings = {
  apiToken: 'secret',
  enabled: true,
  zoneId: 'zone',
}

describe('verifyCloudflareAccess', () => {
  it('rejects a token that cannot see the configured zone', async () => {
    json.mockResolvedValue({ data: { viewer: { zones: [] } } })

    await expect(verifyCloudflareAccess(settings)).rejects.toThrow(
      'cannot access the configured Cloudflare zone',
    )
  })

  it('rejects GraphQL permission errors', async () => {
    json.mockResolvedValue({ errors: [{ message: 'Analytics Read required' }] })

    await expect(verifyCloudflareAccess(settings)).rejects.toThrow(
      'Analytics Read required',
    )
  })
})
