import { describe, expect, it } from 'vitest'
import { customerAnalyticsSchema, updateComplimentaryPlanSchema } from './admin'

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

describe('updateComplimentaryPlanSchema', () => {
  it('uses Free as the explicit grant-revocation choice', () => {
    expect(
      updateComplimentaryPlanSchema.safeParse({ orgId: 'org_1', plan: 'free' })
        .success,
    ).toBe(true)
    expect(
      updateComplimentaryPlanSchema.safeParse({ orgId: 'org_1', plan: 'none' })
        .success,
    ).toBe(false)
  })
})
