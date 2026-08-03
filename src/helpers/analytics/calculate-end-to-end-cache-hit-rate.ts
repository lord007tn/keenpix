export function calculateEndToEndCacheHitRate(input: {
  edgeOffloads: number
  originCacheHits: number
  originRequests: number
}) {
  const clientRequests = input.edgeOffloads + input.originRequests
  return clientRequests === 0
    ? 0
    : ((input.edgeOffloads + input.originCacheHits) / clientRequests) * 100
}
