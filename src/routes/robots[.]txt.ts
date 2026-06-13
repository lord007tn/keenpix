import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isSelfHosted } from '@/server/deployment'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = isSelfHosted()
          ? ['User-agent: *', 'Disallow: /', ''].join('\n')
          : [
              'User-agent: *',
              'Allow: /',
              'Disallow: /api/',
              'Disallow: /app/',
              'Disallow: /login',
              `Sitemap: ${getAppUrl()}/sitemap.xml`,
              '',
            ].join('\n')

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
