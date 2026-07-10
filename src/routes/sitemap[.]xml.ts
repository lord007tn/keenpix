import { createFileRoute } from '@tanstack/react-router'
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
        const staticUrls = [
          '/',
          '/about',
          '/pricing',
          '/blog',
          '/compare',
          '/compare/cloudinary-alternative',
          '/compare/imgix-alternative',
          '/compare/imagekit-alternative',
          '/compare/vercel-image-optimization-alternative',
          '/self-hosted-image-cdn',
          '/changelog',
          '/legal/terms',
          '/legal/privacy',
          '/legal/dpa',
          '/legal/license',
        ]
        const entries = [
          ...staticUrls.map((url) => ({ url, lastmod: undefined })),
          ...source.getPages().map((page) => ({
            url: page.url,
            lastmod: page.data.updated,
          })),
          ...blogSource
            .getPages()
            .filter((page) => !page.data.draft)
            .map((page) => ({ url: page.url, lastmod: page.data.date })),
        ]
        const origin = getAppUrl()
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(({ url, lastmod }) => {
    const isHome = url === '/'
    const isLegal = url.startsWith('/legal')
    let changefreq = 'monthly'
    if (isHome) {
      changefreq = 'weekly'
    } else if (isLegal) {
      changefreq = 'yearly'
    }
    let priority = '0.7'
    if (isHome) {
      priority = '1.0'
    } else if (isLegal) {
      priority = '0.3'
    }
    return `  <url>
    <loc>${origin}${url}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  })
  .join('\n')}
</urlset>
`

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
