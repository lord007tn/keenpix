import { fileURLToPath } from 'node:url'
import { defineNitroConfig } from 'nitro/config'
import { SECURITY_HEADERS } from './src/server/nitro/security-headers'

/**
 * Keep `undici` external in the server build.
 *
 * When Nitro inlines undici into the bundle, its `node:http2` connector breaks
 * ("http2.connect is not a function") and EVERY HTTPS origin fetch from
 * /api/keenpix fails with `fetch failed`. Marking it external leaves the import in
 * place so the real package loads from node_modules at runtime.
 */
// Baseline security response headers on every route. HSTS is only honored by
// browsers over HTTPS, so it's a safe no-op on local http. nosniff is critical
// on /img/** (attacker-influenceable origin bytes, incl. SVG). Frame-ancestors
// deny + Referrer-Policy harden the auth/billing surfaces against clickjacking
// and referrer leakage. A full app-shell CSP is intentionally deferred (needs
// per-route testing against the TanStack hydration inline scripts).
export default defineNitroConfig({
  // Match the app's `@` alias (Nitro's built-in `@` points at rootDir, but ours is
  // `./src`) so these server plugins and their transitive `@/…` imports resolve.
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  // Lifecycle + observability plugins that wrap the h3 app: graceful shutdown
  // marks us un-ready and closes buffered resources; request-log emits a
  // structured access line per request.
  plugins: [
    './src/server/nitro/graceful-shutdown.ts',
    './src/server/nitro/security-headers.ts',
    './src/server/nitro/request-log.ts',
  ],
  handlers: [
    {
      handler: './src/server/nitro/canonical-redirect.ts',
      middleware: true,
      route: '/**',
    },
  ],
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
  },
  rollupConfig: {
    external: [
      // BullMQ's ESM Postgres loader references CommonJS globals. Loading the
      // package through Node preserves its CJS entrypoint; bundling it into the
      // Nitro ESM chunk makes the app crash before it can serve health checks.
      'bullmq',
      'undici',
      'svgo',
      'css-tree',
      '@csstools/css-syntax-patches-for-csstree',
    ],
  },
})
