import { describe, expect, it } from 'vitest'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { SITEMAP_STATIC_PATHS } from '@/helpers/seo/sitemap/sitemap-static-paths'
import { PLANS } from '@/lib/billing/plans'
import { blogSource } from '@/shared/blog-source'
import { source } from '@/shared/docs-source'
import { getPublicMarkdown, listPublicMarkdown } from './public-markdown'

const origin = 'https://keenpix.com'
const TABLE_HEADER = /\| Question\s+\| Evidence\s+\|/
const SECRET_PATTERNS = [
  /D:\\Work\\product-ops/i,
  /\.codex\\(?:sessions|worktrees|visualizations)/i,
  /POLAR_ACCESS_TOKEN\s*=\s*[^<\s]+/i,
  /BETTER_AUTH_SECRET\s*=\s*[a-f0-9]{32,}/i,
  /sk_live_[a-z0-9]+/i,
]

describe('public Markdown registry', () => {
  it('covers every canonical sitemap knowledge page', async () => {
    const paths = [
      ...SITEMAP_STATIC_PATHS,
      ...source.getPages().map((page) => page.url),
      ...blogSource
        .getPages()
        .filter((page) => !page.data.draft)
        .map((page) => page.url),
    ]
    for (const pathname of new Set(paths)) {
      const markdown = await getPublicMarkdown(pathname, origin)
      expect(markdown, pathname).toBeTruthy()
      expect(markdown, pathname).toContain(
        `Canonical HTML: [${origin}${pathname === '/' ? '/' : pathname}]`,
      )
    }
  })

  it('preserves source metadata, headings, code, tables, and citations', async () => {
    const blog = await getPublicMarkdown(
      '/blog/reproducible-image-performance-measurement',
      origin,
    )
    const docs = await getPublicMarkdown('/docs/reference/endpoint', origin)
    const comparison = await getPublicMarkdown(
      `/compare/${Object.keys(COMPARISONS)[0]}`,
      origin,
    )

    expect(blog).toContain('Author: Raed Bahri')
    expect(blog).toContain('Published: 2026-09-02')
    expect(blog).toContain('```json')
    expect(blog).toMatch(TABLE_HEADER)
    expect(blog).toContain('[Largest Contentful Paint, web.dev]')
    expect(docs).toContain('Author: Keenpix Team')
    expect(comparison).toContain('## Feature comparison')
    expect(comparison).toContain('## Sources')
    expect(comparison).toContain('## Limitations and disclosure')
  })

  it('derives pricing from the product catalog and comparisons from one registry', async () => {
    const pricing = await getPublicMarkdown('/pricing', origin)
    const full = await listPublicMarkdown(origin)

    for (const plan of Object.values(PLANS)) {
      expect(pricing).toContain(plan.name)
      expect(pricing).toContain(`${plan.includedBandwidthBytes / 1024 ** 3} GB`)
    }
    for (const comparison of Object.values(COMPARISONS)) {
      expect(
        full.some(
          (document) => document.pathname === `/compare/${comparison.slug}`,
        ),
      ).toBe(true)
    }
  })

  it('returns no Markdown for private, auth, API, and unknown routes', async () => {
    for (const pathname of [
      '/app/dashboard',
      '/admin',
      '/login',
      '/api/sdk/v1/projects',
      '/blog/does-not-exist',
      '/docs/does-not-exist',
      '/blog/ar',
      '/blog/ar/avif-vs-webp-production-caching',
    ]) {
      expect(await getPublicMarkdown(pathname, origin), pathname).toBeNull()
    }
  })

  it('publishes both new English guides without retired locale URLs', async () => {
    const full = await listPublicMarkdown(origin)
    const paths = full.map((document) => document.pathname)

    expect(paths).toContain('/blog/user-upload-image-pipeline-design')
    expect(paths).toContain('/blog/cache-invalidation-versioned-image-urls')
    expect(paths.some((pathname) => pathname.startsWith('/blog/ar'))).toBe(
      false,
    )
    expect(full.map((document) => document.markdown).join('\n')).not.toContain(
      '/blog/ar',
    )
  })

  it('does not leak private workspace or credential material', async () => {
    const all = (await listPublicMarkdown(origin))
      .map((document) => document.markdown)
      .join('\n')
    for (const secretPattern of SECRET_PATTERNS) {
      expect(all).not.toMatch(secretPattern)
    }
  })
})
