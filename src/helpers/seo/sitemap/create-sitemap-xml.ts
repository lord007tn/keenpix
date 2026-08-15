export function createSitemapXml(
  entries: Array<{
    alternates?: Array<{ hreflang: string; url: string }>
    lastmod?: string
    url: string
  }>,
) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    ({ url, lastmod, alternates }) => `  <url>
    <loc>${escapeSitemapValue(url)}</loc>${
      lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
    }${
      alternates?.length
        ? `\n${alternates
            .map(
              (alternate) =>
                `    <xhtml:link rel="alternate" hreflang="${escapeSitemapValue(alternate.hreflang)}" href="${escapeSitemapValue(alternate.url)}" />`,
            )
            .join('\n')}`
        : ''
    }
  </url>`,
  )
  .join('\n')}
</urlset>
`
}

function escapeSitemapValue(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
