import { createFileRoute } from '@tanstack/react-router'
import { buildPublicSitemap } from '@/helpers/seo/sitemap/build-public-sitemap'
import { getAppUrl, isCloud } from '@/server/deployment'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        // No public sitemap for a self-host instance (!isCloud()).
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }

        // Only HTML pages belong here; the llms*.txt endpoints are plain-text and
        // are advertised via robots/link-alternate, not the XML sitemap. Blog
        // entries carry a real <lastmod> from their frontmatter date (already a
        // YYYY-MM-DD W3C datetime, so no timezone-shifting reformatting needed).
        const body = buildPublicSitemap(getAppUrl())

        return new Response(body, {
          headers: {
            'cache-control': 'public, max-age=3600',
            'content-type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})
