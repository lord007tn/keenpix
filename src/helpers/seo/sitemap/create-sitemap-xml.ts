export function createSitemapXml(
  entries: Array<{ lastmod?: string; url: string }>,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    ({ url, lastmod }) => `  <url>
    <loc>${url
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    }
  </url>`,
  )
  .join('\n')}
</urlset>
`
}
