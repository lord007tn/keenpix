import { describe, expect, it } from 'vitest'
import { buildBlogFeed } from './build-blog-feed'

describe('blog feed', () => {
  it('publishes only the English owners and discovers the new guides', () => {
    const feed = buildBlogFeed('https://keenpix.com')

    expect(feed).toContain('<language>en</language>')
    expect(feed).toContain(
      'https://keenpix.com/blog/user-upload-image-pipeline-design',
    )
    expect(feed).toContain(
      'https://keenpix.com/blog/cache-invalidation-versioned-image-urls',
    )
    expect(feed).not.toContain('/blog/ar')
  })

  it('formats date-only frontmatter at UTC midnight in a positive offset', () => {
    const previousTimezone = process.env.TZ
    process.env.TZ = 'Africa/Lagos'

    try {
      const feed = buildBlogFeed('https://keenpix.com')
      expect(feed).toContain('<pubDate>Thu, 03 Sep 2026 00:00:00 GMT</pubDate>')
    } finally {
      if (previousTimezone === undefined) {
        delete process.env.TZ
      } else {
        process.env.TZ = previousTimezone
      }
    }
  })
})
