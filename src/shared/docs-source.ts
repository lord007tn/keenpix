import { docs } from 'collections/server'
import { loader } from 'fumadocs-core/source'
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons'

// Fumadocs content source for /docs, backed by content/docs/*.mdx.
export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  plugins: [lucideIconsPlugin()],
})
