import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import mdx from 'fumadocs-mdx/vite'
import { nitro } from 'nitro/vite'
import { defineConfig, type Plugin } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'

/**
 * Dev-only: stop the dev static-asset handler from shadowing the transform
 * route. It classifies a request as a static file — and 404s `/api/keenpix` —
 * when the URL ends in an image extension (e.g. `&url=…/photo.jpg`) OR when the
 * browser sends `Sec-Fetch-Dest: image` (which every `<img src="/api/keenpix…">`
 * does). We neutralize both signals before the request reaches the handler.
 * Production (Nitro node-server) routes by pathname and is unaffected, so this
 * only restores dev↔prod parity.
 */
const ASSET_EXT = /\.[a-z0-9]{1,5}$/i

function keenpixDevApiPassthrough(): Plugin {
  return {
    name: 'keenpix-dev-api-passthrough',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url
        if (url?.startsWith('/api/keenpix')) {
          if (req.headers['sec-fetch-dest'] === 'image') {
            req.headers['sec-fetch-dest'] = 'empty'
          }
          if (ASSET_EXT.test(url)) {
            req.url = `${url}${url.includes('?') ? '&' : '?'}_keenpix_pad=1`
          }
        }
        next()
      })
    },
  }
}

const config = defineConfig({
  plugins: [
    // Fumadocs MDX — compiles content/docs and provides the `collections/*`
    // modules. Must run before tanstackStart so .mdx routes resolve.
    mdx(),
    keenpixDevApiPassthrough(),
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
