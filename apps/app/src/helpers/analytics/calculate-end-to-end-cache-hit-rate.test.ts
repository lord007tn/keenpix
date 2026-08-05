import { describe, expect, it } from 'vitest'
import { calculateEndToEndCacheHitRate } from './calculate-end-to-end-cache-hit-rate'

describe('calculateEndToEndCacheHitRate', () => {
  it('combines edge offloads and origin cache hits over all client requests', () => {
    expect(
      calculateEndToEndCacheHitRate({
        edgeOffloads: 75,
        originCacheHits: 15,
        originRequests: 25,
      }),
    ).toBe(90)
  })

  it('keeps failed origin requests in the denominator', () => {
    expect(
      calculateEndToEndCacheHitRate({
        edgeOffloads: 60,
        originCacheHits: 20,
        originRequests: 40,
      }),
    ).toBe(80)
  })

  it('returns zero when no requests were captured', () => {
    expect(
      calculateEndToEndCacheHitRate({
        edgeOffloads: 0,
        originCacheHits: 0,
        originRequests: 0,
      }),
    ).toBe(0)
  })
})
