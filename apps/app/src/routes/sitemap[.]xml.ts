import { createFileRoute } from '@tanstack/react-router'
import { createSitemapXml } from '@/helpers/seo/sitemap/create-sitemap-xml'
import { SITEMAP_STATIC_PATHS } from '@/helpers/seo/sitemap/sitemap-static-paths'
import { getAppUrl, isCloud } from '@/server/deployment'
import { blogSource } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'

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
        const origin = getAppUrl()
        const entries = [
          ...SITEMAP_STATIC_PATHS.map((url) => ({ url: `${origin}${url}` })),
          ...source.getPages().map((page) => ({
            url: `${origin}${page.url}`,
            lastmod: page.data.updated,
          })),
          ...blogSource
            .getPages()
            .filter((page) => !page.data.draft)
            .map((page) => ({
              url: `${origin}${page.url}`,
              lastmod: page.data.updated ?? page.data.date,
            })),
        ]
        const body = createSitemapXml(entries)

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
