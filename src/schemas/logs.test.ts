import { describe, expect, it } from 'vitest'
import { logsQuerySchema } from './logs'

describe('logsQuerySchema history windows', () => {
  it('accepts an inclusive custom range', () => {
    expect(
      logsQuerySchema.safeParse({
        range: 'custom',
        from: '2026-07-06',
        to: '2026-07-15',
      }).success,
    ).toBe(true)
  })

  it('requires both custom dates and rejects reversed windows', () => {
    expect(
      logsQuerySchema.safeParse({ range: 'custom', from: '2026-07-06' })
        .success,
    ).toBe(false)
    expect(
      logsQuerySchema.safeParse({
        range: 'custom',
        from: '2026-07-15',
        to: '2026-07-06',
      }).success,
    ).toBe(false)
  })
})
