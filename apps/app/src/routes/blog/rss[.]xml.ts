import { createFileRoute } from '@tanstack/react-router'
import { buildBlogFeed } from '@/helpers/seo/rss/build-blog-feed'
import { getAppUrl, isCloud } from '@/server/deployment'

// RSS 2.0 feed for the blog — newsletter tooling, feed readers, and AI crawlers
// discover new comparison posts here. Cloud-only like the rest of the public
// marketing surface (self-host serves no blog).

export const Route = createFileRoute('/blog/rss.xml')({
  server: {
    handlers: {
      GET: () => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }
        return new Response(buildBlogFeed(getAppUrl()), {
          headers: {
            'content-type': 'application/rss+xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
