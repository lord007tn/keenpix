import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isCloud } from '@/server/deployment'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        // Only the cloud marketing site should be crawlable; a self-host instance
        // (!isCloud()) disallows everything.
        const body = isCloud()
          ? robotsText(getAppUrl())
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

export function robotsText(baseUrl: string) {
  const protectedPaths = ['/admin', '/api', '/app']
  const groups = ['OAI-SearchBot', 'Googlebot', 'Bingbot', '*'].flatMap(
    (crawler) => [
      `User-agent: ${crawler}`,
      'Allow: /',
      ...protectedPaths.flatMap((pathname) => [
        `Disallow: ${pathname}$`,
        `Disallow: ${pathname}/`,
      ]),
      '',
    ],
  )

  return [
    // OAI-SearchBot gets the same anonymous public surface as other crawlers,
    // never a privileged path. User-agent strings can be spoofed; infrastructure
    // trust decisions must use verified bot/IP signals instead.
    ...groups,
    '',
    // Auth pages (/login, /signup, …) are left crawlable so search engines can
    // fetch their noindex meta instead of surfacing a bare, snippet-less URL.
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')
}
