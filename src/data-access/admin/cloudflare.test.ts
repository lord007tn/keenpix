import { beforeEach, describe, expect, it, vi } from 'vitest'

const { env, findUnique } = vi.hoisted(() => ({
  env: {
    CLOUDFLARE_API_TOKEN: 'environment-token',
    CLOUDFLARE_HOST: 'keenpix.com',
    CLOUDFLARE_ZONE_ID: 'environment-zone',
  },
  findUnique: vi.fn(),
}))

vi.mock('@/db', () => ({
  prisma: {
    cloudflareSettings: {
      findUnique,
    },
  },
}))
vi.mock('@/env/server', () => ({ env }))
vi.mock('@/lib/secrets/crypto', () => ({
  decryptSecret: vi.fn((value) => value),
  encryptSecret: vi.fn((value) => value),
}))

const { getPublicCloudflareSettings } = await import('./cloudflare')

describe('getPublicCloudflareSettings', () => {
  beforeEach(() => {
    findUnique.mockReset()
    env.CLOUDFLARE_API_TOKEN = 'environment-token'
    env.CLOUDFLARE_HOST = 'keenpix.com'
    env.CLOUDFLARE_ZONE_ID = 'environment-zone'
  })

  it('reports the environment fallback when stored settings are disabled', async () => {
    findUnique.mockResolvedValue({
      apiToken: 'stored-token',
      enabled: false,
      host: 'stored.example',
      zoneId: 'stored-zone',
    })

    await expect(getPublicCloudflareSettings()).resolves.toEqual({
      enabled: true,
      host: 'keenpix.com',
      source: 'environment',
      tokenSet: true,
      zoneId: 'environment-zone',
    })
  })

  it('prefers complete enabled database settings', async () => {
    findUnique.mockResolvedValue({
      apiToken: 'stored-token',
      enabled: true,
      host: 'images.keenpix.com',
      zoneId: 'stored-zone',
    })

    await expect(getPublicCloudflareSettings()).resolves.toEqual({
      enabled: true,
      host: 'images.keenpix.com',
      source: 'database',
      tokenSet: true,
      zoneId: 'stored-zone',
    })
  })
})
