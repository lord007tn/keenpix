import { blogSource } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'
import { createSitemapXml } from './create-sitemap-xml'
import { SITEMAP_STATIC_PATHS } from './sitemap-static-paths'

export function buildPublicSitemap(origin: string) {
  return createSitemapXml([
    ...SITEMAP_STATIC_PATHS.map((url) => ({ url: `${origin}${url}` })),
    ...source.getPages().map((page) => ({
      url: `${origin}${page.url}`,
      lastmod: page.data.updated,
    })),
    ...blogSource
      .getPages()
      .filter((page) => !page.data.draft)
      .map((page) => ({
        url: `${origin}${page.url}`,
        lastmod: page.data.updated ?? page.data.date,
      })),
  ])
}
