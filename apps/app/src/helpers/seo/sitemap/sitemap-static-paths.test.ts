import { describe, expect, it } from 'vitest'
import { COMPARISONS } from '@/features/compare/comparison-data'
import { SITEMAP_STATIC_PATHS } from './sitemap-static-paths'

describe('sitemap static paths', () => {
  it('includes every registered comparison page', () => {
    expect(SITEMAP_STATIC_PATHS).toEqual(
      expect.arrayContaining(
        Object.keys(COMPARISONS).map((slug) => `/compare/${slug}`),
      ),
    )
  })
})
