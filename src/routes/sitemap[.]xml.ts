import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isSelfHosted } from '@/server/deployment'
import { source } from '@/shared/docs-source'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        if (isSelfHosted()) {
          return new Response('Not found', { status: 404 })
        }

        const urls = [
          '/',
          '/llms.txt',
          '/llms-full.txt',
          ...source.getPages().map((page) => page.url),
        ]
        const origin = getAppUrl()
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${origin}${url}</loc>
    <changefreq>${url === '/' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${url === '/' ? '1.0' : '0.7'}</priority>
  </url>`,
  )
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
