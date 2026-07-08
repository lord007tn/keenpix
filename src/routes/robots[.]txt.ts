import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isCloud } from '@/server/deployment'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        // Only the cloud marketing site should be crawlable; a self-host instance
        // (!isCloud()) disallows everything.
        const body = isCloud()
          ? [
              'User-agent: *',
              'Allow: /',
              'Disallow: /api/',
              'Disallow: /app/',
              'Disallow: /login',
              `Sitemap: ${getAppUrl()}/sitemap.xml`,
              '',
            ].join('\n')
          : ['User-agent: *', 'Disallow: /', ''].join('\n')

        return new Response(body, {
          headers: {
            'cache-control': 'public, max-age=3600',
            'content-type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
