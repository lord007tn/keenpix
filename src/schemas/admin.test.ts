import { describe, expect, it } from 'vitest'
import { customerAnalyticsSchema } from './admin'

describe('customerAnalyticsSchema', () => {
  it('rejects malformed custom calendar dates', () => {
    const result = customerAnalyticsSchema.safeParse({
      from: 'garbage',
      orgId: 'org_1',
      range: 'custom',
      to: 'also-bad',
    })

    expect(result.success).toBe(false)
  })
})
