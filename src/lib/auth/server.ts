import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from '@/db'
import { env } from '@/env/server'

const isProd = env.NODE_ENV === 'production'
const ORIGIN_LIST_SEPARATOR_RE = /[\s,]+/
const TRAILING_SLASHES_RE = /\/+$/

/** Reject placeholder/known-weak secrets (normalized) so the repo's own dev
 * value — and any human-written placeholder, including the one shipped in
 * `.env.example` — can never sign prod sessions. */
function isWeakSecret(secret: string): boolean {
  const norm = secret.trim().toLowerCase()
  return (
    norm.length < 32 ||
    norm.includes('change-me') ||
    norm.includes('dev-secret') ||
    norm.includes('placeholder') ||
    norm.includes('example') ||
    norm.includes('replace') ||
    norm.includes('generate') ||
    norm.includes('openssl') ||
    norm.includes('rand -hex')
  )
}

function resolveAuthSecret(): string {
  const s = env.BETTER_AUTH_SECRET
  if (s && !isWeakSecret(s)) {
    return s
  }
  if (isProd) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set to a strong, unique value in production — generate one with `openssl rand -hex 32`.',
    )
  }
  return s ?? 'dev-secret-change-me'
}

function splitOriginList(value: string | undefined) {
  return value?.split(ORIGIN_LIST_SEPARATOR_RE).filter(Boolean) ?? []
}

function addOrigin(out: Set<string>, value: string | undefined) {
  if (!value) {
    return
  }

  const raw = value.trim().replace(TRAILING_SLASHES_RE, '')
  if (!raw) {
    return
  }

  if (raw.includes('*')) {
    out.add(raw)
    return
  }

  try {
    out.add(new URL(raw).origin)
  } catch {
    // Ignore malformed optional origins instead of blocking app boot.
  }
}

function resolveTrustedOrigins(authUrl: string) {
  const origins = new Set<string>()

  addOrigin(origins, authUrl)
  addOrigin(origins, env.KEENPIX_APP_URL)

  for (const origin of splitOriginList(env.COOLIFY_URL)) {
    addOrigin(origins, origin)
  }

  for (const host of splitOriginList(env.COOLIFY_FQDN)) {
    addOrigin(origins, host.includes('://') ? host : `https://${host}`)
  }

  for (const origin of splitOriginList(env.BETTER_AUTH_TRUSTED_ORIGINS)) {
    addOrigin(origins, origin)
  }

  return Array.from(origins)
}

const authUrl =
  env.BETTER_AUTH_URL ?? env.COOLIFY_URL ?? 'http://localhost:3000'

export const auth = betterAuth({
  baseURL: authUrl,
  trustedOrigins: resolveTrustedOrigins(authUrl),
  secret: resolveAuthSecret(),
  advanced: {
    // Secure cookies once the deployment is served over TLS.
    useSecureCookies: authUrl.startsWith('https://'),
    trustedProxyHeaders: true,
    // Behind the bundled reverse proxy, key per-IP limits on the real client IP.
    ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
  },
  // Abuse guard. better-auth's limiter defaults to prod-only; enable it in dev.
  // (In-memory store — back with secondaryStorage for multi-replica.)
  rateLimit: {
    enabled: true,
    customRules: {
      '/sign-in/email': { window: 300, max: 10 },
    },
  },
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  plugins: [
    admin(),
    // Must be last so it can post-process Set-Cookie headers.
    tanstackStartCookies(),
  ],
})
