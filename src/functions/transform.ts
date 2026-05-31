import { optimizeProjectImage } from '@/actions/transform'
import {
  getPublicTransformErrorMessage,
  getTransformErrorStatus,
} from '@/errors/transform'
import { cacheControl } from '@/lib/cdn/cache'
import { contentTypeFor } from '@/lib/sharp/transform'

/**
 * HTTP boundary for the transform API. Routes call functions; functions adapt
 * request/response details and delegate use-case work to actions.
 */
export async function handleTransformRequest(request: Request) {
  const startedAt = Date.now()
  const searchParams = new URL(request.url).searchParams
  const src = searchParams.get('url')

  if (!src) {
    return new Response('Missing ?url', { status: 400 })
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
        'content-type': contentTypeFor(result.format),
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
