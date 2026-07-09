import { getPublicCloudflareSettings } from '@/data-access/admin/cloudflare'
import { env } from '@/env/server'
import { cacheControl } from '@/lib/cache/cache'
import { getAppUrl, isCloud } from '@/server/deployment'
import { APP_VERSION } from '@/shared/seo'

// Platform configuration for the operator Settings page. Deployment facts plus
// the effective (environment-driven) cache/CDN config. Read-only — the operator
// tunes it via env, not the UI.
export async function getPlatformConfig() {
  const objectStorage = Boolean(
    env.KEENPIX_CACHE_S3_BUCKET &&
      env.KEENPIX_CACHE_S3_ENDPOINT &&
      env.KEENPIX_CACHE_S3_ACCESS_KEY_ID &&
      env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
  )
  return {
    deployment: {
      mode: isCloud() ? ('cloud' as const) : ('self-host' as const),
      version: APP_VERSION,
      appUrl: getAppUrl(),
      clickhouse: Boolean(env.CLICKHOUSE_URL),
    },
    cache: {
      cacheControl: cacheControl(),
      diskMaxBytes: env.KEENPIX_CACHE_MAX_BYTES,
      memoryMaxBytes: env.KEENPIX_MEMORY_CACHE_MAX_BYTES,
      staleMs: env.KEENPIX_CACHE_STALE_MS,
      storageTier: objectStorage ? ('object' as const) : ('disk' as const),
    },
    cloudflare: await getPublicCloudflareSettings(),
  }
}
