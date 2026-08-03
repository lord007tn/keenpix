import { describe, expect, it } from 'vitest'
import { calculateOperatingCost } from './calculate-operating-cost'

const settings = {
  serverMonthlyCents: 10_000,
  databaseMonthlyCents: 5000,
  observabilityMonthlyCents: 2000,
  otherMonthlyCents: 1000,
  originRequestsMicrodollarsPerMillion: 2_000_000,
  originBandwidthMicrodollarsPerGb: 15_000,
  paymentFeeBasisPoints: 500,
  paymentFixedCents: 50,
  edgeRequestsMicrodollarsPerMillion: 500_000,
  edgeBandwidthMicrodollarsPerGb: 10_000,
}

describe('calculateOperatingCost', () => {
  it('prorates monthly fixed costs and prices each delivery source', () => {
    const result = calculateOperatingCost({
      days: 30.4375,
      originRequests: 2_000_000,
      originBandwidthBytes: 100_000_000_000,
      edgeRequests: 4_000_000,
      edgeBandwidthBytes: 200_000_000_000,
      settings,
    })

    expect(result).toEqual({
      fixedMonthlyCents: 18_000,
      fixedCents: 18_000,
      originRequestCents: 400,
      originBandwidthCents: 150,
      edgeRequestCents: 200,
      edgeBandwidthCents: 200,
      totalCents: 18_950,
    })
  })

  it('never produces negative fixed costs for an empty window', () => {
    expect(
      calculateOperatingCost({
        days: -2,
        originRequests: 0,
        originBandwidthBytes: 0,
        edgeRequests: 0,
        edgeBandwidthBytes: 0,
        settings,
      }).fixedCents,
    ).toBe(0)
  })
})
