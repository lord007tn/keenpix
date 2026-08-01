import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getEffectiveCloudflareSettings,
  getPublicCloudflareSettings,
  verifyCloudflareAccess,
} = vi.hoisted(() => ({
  getEffectiveCloudflareSettings: vi.fn(),
  getPublicCloudflareSettings: vi.fn(),
  verifyCloudflareAccess: vi.fn(),
}))

vi.mock('@/data-access/admin/cloudflare', () => ({
  getEffectiveCloudflareSettings,
  getPublicCloudflareSettings,
}))
vi.mock('@/env/server', () => ({
  env: {
    CLICKHOUSE_URL: '',
    KEENPIX_CACHE_MAX_BYTES: 1,
    KEENPIX_CACHE_S3_ACCESS_KEY_ID: '',
    KEENPIX_CACHE_S3_BUCKET: '',
    KEENPIX_CACHE_S3_ENDPOINT: '',
    KEENPIX_CACHE_S3_SECRET_ACCESS_KEY: '',
    KEENPIX_CACHE_STALE_MS: 2,
    KEENPIX_MEMORY_CACHE_MAX_BYTES: 3,
  },
}))
vi.mock('@/lib/cache/cache', () => ({ cacheControl: () => 'max-age=60' }))
vi.mock('@/lib/cloudflare/analytics', () => ({ verifyCloudflareAccess }))
vi.mock('@/server/deployment', () => ({
  getAppUrl: () => 'https://keenpix.com',
  isCloud: () => true,
}))
vi.mock('@/shared/seo', () => ({ APP_VERSION: 'test' }))

const { getPlatformConfig } = await import('./cdn')

describe('getPlatformConfig Cloudflare status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPublicCloudflareSettings.mockResolvedValue({
      enabled: true,
      host: 'keenpix.com',
      source: 'environment',
      tokenSet: true,
      zoneId: 'zone',
    })
    getEffectiveCloudflareSettings.mockResolvedValue({
      apiToken: 'secret',
      enabled: true,
      host: 'keenpix.com',
      zoneId: 'zone',
    })
  })

  it('reports connected only after a live analytics check', async () => {
    verifyCloudflareAccess.mockResolvedValue(1)

    await expect(getPlatformConfig()).resolves.toMatchObject({
      cloudflare: { connectionStatus: 'connected' },
    })
  })

  it('distinguishes valid access from a host with no recent traffic', async () => {
    verifyCloudflareAccess.mockResolvedValue(0)

    await expect(getPlatformConfig()).resolves.toMatchObject({
      cloudflare: { connectionStatus: 'connected_no_data' },
    })
  })

  it('keeps platform settings available when the provider check fails', async () => {
    verifyCloudflareAccess.mockRejectedValue(new Error('HTTP 403'))

    await expect(getPlatformConfig()).resolves.toMatchObject({
      deployment: { mode: 'cloud' },
      cloudflare: { connectionStatus: 'failed' },
    })
  })

  it('does not call Cloudflare when analytics is incomplete', async () => {
    getPublicCloudflareSettings.mockResolvedValue({
      enabled: false,
      host: '',
      source: 'none',
      tokenSet: false,
      zoneId: '',
    })

    await expect(getPlatformConfig()).resolves.toMatchObject({
      cloudflare: { connectionStatus: 'not_configured' },
    })
    expect(verifyCloudflareAccess).not.toHaveBeenCalled()
  })
})
