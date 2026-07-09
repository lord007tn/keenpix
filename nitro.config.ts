import { fileURLToPath } from 'node:url'
import { defineNitroConfig } from 'nitro/config'

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
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

export default defineNitroConfig({
  // Match the app's `@` alias (Nitro's built-in `@` points at rootDir, but ours is
  // `./src`) so these server plugins and their transitive `@/…` imports resolve.
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  // Lifecycle + observability plugins that wrap the h3 app: graceful-shutdown drains
  // the transform queue on SIGTERM and marks us un-ready; request-log emits a
  // structured access line per request.
  plugins: [
    './src/server/nitro/graceful-shutdown.ts',
    './src/server/nitro/request-log.ts',
  ],
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
  },
  rollupConfig: {
    external: [
      'undici',
      'svgo',
      'css-tree',
      '@csstools/css-syntax-patches-for-csstree',
    ],
  },
})
