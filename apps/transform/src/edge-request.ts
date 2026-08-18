import { timingSafeEqual } from 'node:crypto'

const HOSTNAME_RE =
  /^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/
const PROJECT_ID_RE = /^[a-z0-9][a-z0-9_-]{7,127}$/
const EDGE_CACHE_HOST_PARAM = '__keenpix_edge_host'
export const EDGE_PROJECT_HEADER = 'x-keenpix-edge-project'

export function getTrustedEdgeRequest(
  request: Request,
  expectedSecret?: string,
) {
  const providedSecret = request.headers.get('x-keenpix-edge-secret') ?? ''
  const hostname = (
    request.headers.get('x-keenpix-custom-host') ?? ''
  ).toLowerCase()
  if (!(expectedSecret && providedSecret && HOSTNAME_RE.test(hostname))) {
    return
  }
  const expected = Buffer.from(expectedSecret)
  const provided = Buffer.from(providedSecret)
  if (
    expected.byteLength !== provided.byteLength ||
    !timingSafeEqual(expected, provided)
  ) {
    return
  }
  const requestedProjectId = request.headers.get(EDGE_PROJECT_HEADER) ?? ''
  return {
    hostname,
    projectId: PROJECT_ID_RE.test(requestedProjectId)
      ? requestedProjectId
      : undefined,
  }
}

export function validateEdgePartition(
  searchParams: URLSearchParams,
  hostname?: string,
) {
  const cacheHostname = searchParams.get(EDGE_CACHE_HOST_PARAM)
  if (!hostname) {
    return cacheHostname === null
  }
  if (cacheHostname !== hostname) {
    return false
  }
  searchParams.delete(EDGE_CACHE_HOST_PARAM)
  return true
}
