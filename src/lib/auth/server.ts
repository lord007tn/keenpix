import { apiKey } from '@better-auth/api-key'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from '@/db'
import { env } from '@/env/server'

const isProd = env.NODE_ENV === 'production'

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

const authUrl = env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export const auth = betterAuth({
  baseURL: authUrl,
  trustedOrigins: [new URL(authUrl).origin],
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
    apiKey({
      configId: 'internal',
      apiKeyHeaders: ['x-keenpix-api-key'],
      customAPIKeyGetter: (ctx) => {
        const authorization = ctx.headers?.get('authorization')?.trim()
        if (authorization?.toLowerCase().startsWith('bearer ')) {
          return authorization.slice(7).trim()
        }
        return ctx.headers?.get('x-keenpix-api-key')?.trim() ?? null
      },
      defaultPrefix: 'kp_internal_',
      requireName: true,
      maximumNameLength: 80,
      rateLimit: {
        enabled: true,
        maxRequests: 10_000,
        timeWindow: 1000 * 60 * 60 * 24,
      },
      permissions: {
        defaultPermissions: {
          projects: ['read', 'write'],
        },
      },
      schema: {
        apikey: {
          modelName: 'apiKey',
        },
      },
    }),
    admin(),
    // Must be last so it can post-process Set-Cookie headers.
    tanstackStartCookies(),
  ],
})
