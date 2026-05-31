import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { admin } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from '@/db'

const isProd = process.env.NODE_ENV === 'production'

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
  const s = process.env.BETTER_AUTH_SECRET
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

const authUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'

export const auth = betterAuth({
  baseURL: authUrl,
  secret: resolveAuthSecret(),
  advanced: {
    // Secure cookies once the deployment is served over TLS.
    useSecureCookies: authUrl.startsWith('https://'),
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
