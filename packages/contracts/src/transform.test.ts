import { describe, expect, it } from 'vitest'
import {
  PREWARM_CONTRACT_VERSION,
  prewarmTransformSchema,
  TRANSFORM_API_VERSION,
} from './transform'

describe('transform contracts', () => {
  it('accepts the current prewarm contract', () => {
    expect(
      prewarmTransformSchema.parse({
        accept: 'image/avif,image/webp',
        correlationId: 'request-1',
        params: { q: '80', w: '1200' },
        projectId: 'project-1',
        requestedAt: '2026-08-13T00:00:00.000Z',
        src: 'https://images.example.com/hero.jpg',
        version: PREWARM_CONTRACT_VERSION,
      }).version,
    ).toBe(1)
    expect(TRANSFORM_API_VERSION).toBe('v1')
  })

  it('rejects jobs from an unknown contract version', () => {
    expect(
      prewarmTransformSchema.safeParse({
        accept: '',
        correlationId: 'request-1',
        params: {},
        projectId: 'project-1',
        requestedAt: '2026-08-13T00:00:00.000Z',
        src: 'https://images.example.com/hero.jpg',
        version: 2,
      }).success,
    ).toBe(false)
  })
})
