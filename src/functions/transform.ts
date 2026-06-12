import { optimizeProjectImage } from '@/actions/transform'
import {
  getPublicTransformErrorMessage,
  getTransformErrorStatus,
} from '@/errors/transform'
import { cacheControl } from '@/lib/cache/cache'
import { getContentType } from '@/shared/transform'

const LEADING_SLASHES_RE = /^\/+/

// HTTP boundary for the transform API. Routes handle URL shape here, then the
// action layer owns project lookup, origin safety, transforms, cache, and logs.
export async function handleTransformRequest(
  request: Request,
  pathSource?: string,
) {
  const startedAt = performance.now()
  const searchParams = new URL(request.url).searchParams
  const src = pathSource
    ? decodeSourcePath(pathSource)
    : searchParams.get('url')

  if (!src) {
    return new Response('Missing source image URL', { status: 400 })
  }

  const projectId = searchParams.get('project')
  if (!projectId) {
    return new Response('Missing ?project', { status: 400 })
  }

  try {
    const result = await optimizeProjectImage({
      accept: request.headers.get('accept') ?? '',
      projectId,
      searchParams,
      src,
      startedAt,
    })

    return new Response(new Uint8Array(result.body), {
      status: 200,
      headers: {
        'content-type': getContentType(result.format),
        'content-length': String(result.body.byteLength),
        'cache-control': cacheControl(),
        vary: 'Accept',
      },
    })
  } catch (error) {
    return new Response(getPublicTransformErrorMessage(error), {
      status: getTransformErrorStatus(error),
    })
  }
}

function decodeSourcePath(pathSource: string) {
  const trimmed = pathSource.replace(LEADING_SLASHES_RE, '')
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}
