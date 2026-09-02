import { describe, expect, it } from 'vitest'
import { listBlogPosts } from './blog-source'
import {
  FEATURED_LEARNING_SLUGS,
  LEARNING_GUIDE_CLASSIFICATION,
  LEARNING_PILLARS,
} from './learning-content'

describe('learning content taxonomy', () => {
  it('classifies every published English guide exactly once', () => {
    const published = listBlogPosts()
      .map((post) => post.slug)
      .sort()
    const classified = Object.keys(LEARNING_GUIDE_CLASSIFICATION).sort()

    expect(classified).toEqual(published)
  })

  it('uses only registered pillars and has featured answers', () => {
    const pillarIds = new Set(LEARNING_PILLARS.map((pillar) => pillar.id))
    for (const classification of Object.values(LEARNING_GUIDE_CLASSIFICATION)) {
      expect(pillarIds.has(classification.pillar)).toBe(true)
    }
    expect(FEATURED_LEARNING_SLUGS.length).toBeGreaterThanOrEqual(6)
  })
})
