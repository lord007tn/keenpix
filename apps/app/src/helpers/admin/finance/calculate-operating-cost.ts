const BYTES_PER_GB = 1_000_000_000
const DAYS_PER_MONTH = 30.4375

export interface FinanceCostSettings {
  databaseMonthlyCents: number
  edgeBandwidthMicrodollarsPerGb: number
  edgeRequestsMicrodollarsPerMillion: number
  observabilityMonthlyCents: number
  originBandwidthMicrodollarsPerGb: number
  originRequestsMicrodollarsPerMillion: number
  otherMonthlyCents: number
  paymentFeeBasisPoints: number
  paymentFixedCents: number
  serverMonthlyCents: number
}

export function calculateOperatingCost(input: {
  days: number
  edgeBandwidthBytes: number
  edgeRequests: number
  originBandwidthBytes: number
  originRequests: number
  settings: FinanceCostSettings
}) {
  const fixedMonthlyCents =
    input.settings.serverMonthlyCents +
    input.settings.databaseMonthlyCents +
    input.settings.observabilityMonthlyCents +
    input.settings.otherMonthlyCents
  const fixedCents = Math.round(
    fixedMonthlyCents * (Math.max(input.days, 0) / DAYS_PER_MONTH),
  )
  const originRequestCents = Math.round(
    (input.originRequests / 1_000_000) *
      (input.settings.originRequestsMicrodollarsPerMillion / 10_000),
  )
  const originBandwidthCents = Math.round(
    (input.originBandwidthBytes / BYTES_PER_GB) *
      (input.settings.originBandwidthMicrodollarsPerGb / 10_000),
  )
  const edgeRequestCents = Math.round(
    (input.edgeRequests / 1_000_000) *
      (input.settings.edgeRequestsMicrodollarsPerMillion / 10_000),
  )
  const edgeBandwidthCents = Math.round(
    (input.edgeBandwidthBytes / BYTES_PER_GB) *
      (input.settings.edgeBandwidthMicrodollarsPerGb / 10_000),
  )

  return {
    fixedMonthlyCents,
    fixedCents,
    originRequestCents,
    originBandwidthCents,
    edgeRequestCents,
    edgeBandwidthCents,
    totalCents:
      fixedCents +
      originRequestCents +
      originBandwidthCents +
      edgeRequestCents +
      edgeBandwidthCents,
  }
}
