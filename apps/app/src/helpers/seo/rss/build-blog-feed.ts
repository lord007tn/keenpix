import dayjs from 'dayjs'
import { listBlogPosts } from '@/shared/blog-source'

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}
const XML_UNSAFE = /[&<>"']/g

function escapeXml(value: string) {
  return value.replace(XML_UNSAFE, (char) => XML_ESCAPES[char])
}

export function buildBlogFeed(baseUrl: string) {
  const items = listBlogPosts()
    .map((post) => {
      const url = `${baseUrl}${post.url}`
      return [
        '    <item>',
        `      <title>${escapeXml(post.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(post.description)}</description>`,
        `      <pubDate>${dayjs(`${post.date}T00:00:00Z`).toDate().toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>Keenpix Blog</title>',
    `    <link>${escapeXml(`${baseUrl}/blog`)}</link>`,
    '    <description>Honest writing about image optimization, delivery, and pricing.</description>',
    '    <language>en</language>',
    `    <atom:link href="${escapeXml(`${baseUrl}/blog/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
