import { defineNitroConfig } from 'nitro/config'

/**
 * Keep `undici` external in the server build.
 *
 * When Nitro inlines undici into the bundle, its `node:http2` connector breaks
 * ("http2.connect is not a function") and EVERY HTTPS origin fetch from
 * /api/keenpix fails with `fetch failed`. Marking it external leaves the import in
 * place so the real package loads from node_modules at runtime.
 */
export default defineNitroConfig({
  rollupConfig: { external: ['undici'] },
})
