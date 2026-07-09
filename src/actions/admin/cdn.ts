import { getPublicCloudflareSettings } from '@/data-access/admin/cloudflare'
import { env } from '@/env/server'
import { cacheControl } from '@/lib/cache/cache'

// Read-only CDN / cache configuration for the operator Settings page. Every
// value is environment-driven (KEENPIX_CACHE_* / CLOUDFLARE_*) — the operator
// tunes it via env, not the UI — so this only surfaces the effective config.
export async function getCdnConfig() {
  return {
    cacheControl: cacheControl(),
    cacheMaxBytes: env.KEENPIX_CACHE_MAX_BYTES,
    memoryCacheMaxBytes: env.KEENPIX_MEMORY_CACHE_MAX_BYTES,
    cacheStaleMs: env.KEENPIX_CACHE_STALE_MS,
    objectStorage: Boolean(
      env.KEENPIX_CACHE_S3_BUCKET &&
        env.KEENPIX_CACHE_S3_ENDPOINT &&
        env.KEENPIX_CACHE_S3_ACCESS_KEY_ID &&
        env.KEENPIX_CACHE_S3_SECRET_ACCESS_KEY,
    ),
    cloudflare: await getPublicCloudflareSettings(),
  }
}
