import { createFileRoute } from '@tanstack/react-router'
import { getAppUrl, isCloud } from '@/server/deployment'
import { listBlogPosts } from '@/shared/blog-source'

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}
const XML_UNSAFE = /[&<>"']/g

function escapeXml(value: string): string {
  return value.replace(XML_UNSAFE, (char) => XML_ESCAPES[char])
}

// RSS 2.0 feed for the blog — newsletter tooling, feed readers, and AI crawlers
// discover new comparison posts here. Cloud-only like the rest of the public
// marketing surface (self-host serves no blog).
function buildFeed(): string {
  const base = getAppUrl()
  const posts = listBlogPosts()
  const items = posts
    .map((post) => {
      const url = `${base}${post.url}`
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <pubDate>${new Date(post.date).toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Keenpix Blog</title>',
    `    <link>${escapeXml(`${base}/blog`)}</link>`,
    '    <description>Honest writing about image optimization, delivery, and pricing.</description>',
    '    <language>en</language>',
    `    <atom:link href="${escapeXml(`${base}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}

export const Route = createFileRoute('/blog/rss.xml')({
  server: {
    handlers: {
      GET: () => {
        if (!isCloud()) {
          return new Response('Not found', { status: 404 })
        }
        return new Response(buildFeed(), {
          headers: {
            'content-type': 'application/rss+xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
