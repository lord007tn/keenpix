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
})
