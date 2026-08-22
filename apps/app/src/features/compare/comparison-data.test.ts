import { describe, expect, it } from 'vitest'
import { COMPARISONS } from './comparison-data'

const comparisonIntentPattern = /alternative|vs/
const earliestCurrentVerificationDate = '2026-08-22'

describe('comparison data', () => {
  it('publishes the intended evidence-led competitor set', () => {
    expect(Object.keys(COMPARISONS)).toEqual(
      expect.arrayContaining([
        'cloudinary-alternative',
        'cloudflare-images-alternative',
        'bunny-optimizer-alternative',
        'imgix-alternative',
        'imgproxy-alternative',
        'imagekit-alternative',
        'gumlet-alternative',
        'vercel-image-optimization-alternative',
      ]),
    )
  })

  it('gives every page comparison intent and review accountability', () => {
    for (const comparison of Object.values(COMPARISONS)) {
      expect(comparison.heroHeadline.toLowerCase()).toContain(
        comparison.competitor.toLowerCase(),
      )
      expect(comparison.heroHeadline.toLowerCase()).toMatch(
        comparisonIntentPattern,
      )
      expect(comparison.reviewer).toContain('Raed Bahri')
      expect(comparison.verifiedAt >= earliestCurrentVerificationDate).toBe(
        true,
      )
      expect(comparison.nextReviewAt).toBe('2026-10-12')
      expect(comparison.sources.length).toBeGreaterThanOrEqual(3)
      expect(
        comparison.sources.every(
          (source) =>
            source.url.startsWith('https://') || source.url.startsWith('/'),
        ),
      ).toBe(true)
      expect(comparison.whenCompetitorWins.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('does not repeat unsupported competitor allegations', () => {
    const content = JSON.stringify(COMPARISONS).toLowerCase()

    expect(content).not.toContain('silently stops')
    expect(content).not.toContain('blocking reported')
    expect(content).not.toContain('rug-pull')
    expect(content).not.toContain('serves every image on joodlab.com')
    expect(content).not.toContain('full ipx-parity')
  })
})
