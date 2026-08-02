const OUTCOME_RANGES = {
  success: [200, 299],
  redirect: [300, 399],
  'client-error': [400, 499],
  'server-error': [500, 599],
} as const

export function getAnalyticsStatusCodes(filters?: {
  outcome?: string[]
  status?: string[]
}) {
  const explicit = filters?.status
    ?.map(Number)
    .filter(
      (status) => Number.isInteger(status) && status >= 100 && status < 600,
    )
  const ranges = filters?.outcome
    ?.map((outcome) => OUTCOME_RANGES[outcome as keyof typeof OUTCOME_RANGES])
    .filter((range) => range !== undefined)

  if (!(explicit?.length || ranges?.length)) {
    return
  }

  const matchesOutcome = (status: number) =>
    ranges?.some(
      ([minimum, maximum]) => status >= minimum && status <= maximum,
    ) ?? true

  if (explicit?.length) {
    return [...new Set(explicit.filter(matchesOutcome))]
  }

  const codes: number[] = []
  for (const [minimum, maximum] of ranges ?? []) {
    for (let status = minimum; status <= maximum; status += 1) {
      codes.push(status)
    }
  }
  return [...new Set(codes)]
}
