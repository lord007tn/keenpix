import { z } from 'zod'
import { addSdkApiActivity, type SdkApiActivityContext } from './activity'
import {
  addProjectDomain,
  createProjectResource,
  getProjectConfiguration,
  getProjectResource,
  listProjectResources,
  prewarmProjectImagesResource,
  removeProjectDomain,
  updateProjectSettingsResource,
} from './projects'
import { jsonError } from './responses'

export async function handleSdkRequest(
  request: Request,
  splat: string | undefined,
  method: string,
) {
  const pathSegments = (splat ?? '').split('/').filter(Boolean)
  // v1 is the stable public SDK contract. Keep the unversioned path as a
  // compatibility alias for integrations created before the npm SDK existed.
  const segments =
    pathSegments[0] === 'v1' ? pathSegments.slice(1) : pathSegments
  const activity: SdkApiActivityContext = {}
  const startedAt = performance.now()
  let response: Response | undefined

  try {
    response = await routeSdkRequest(request, method, segments, activity)
    return response
  } catch (error) {
    if (error instanceof Response) {
      response = error
      return error
    }
    if (error instanceof z.ZodError) {
      response = jsonError(
        error.issues[0]?.message ?? 'Invalid request body',
        400,
        {
          code: 'invalid_request',
          resolutionHint:
            'Review the operation request schema in /openapi.json and correct the rejected field.',
        },
      )
      return response
    }
    if (error instanceof SyntaxError) {
      response = jsonError('Invalid JSON request body', 400, {
        code: 'invalid_json',
        resolutionHint:
          'Send a valid JSON document with Content-Type: application/json.',
      })
      return response
    }
    response = jsonError('SDK API request failed', 500, {
      code: 'internal_error',
      resolutionHint:
        'Retry the request with the returned X-Request-Id, then contact Keenpix support if the failure continues.',
    })
    return response
  } finally {
    await addSdkApiActivity(request, activity, response, startedAt)
  }
}

function routeSdkRequest(
  request: Request,
  method: string,
  segments: string[],
  activity: SdkApiActivityContext,
) {
  if (segments[0] !== 'projects') {
    return sdkEndpointNotFound()
  }

  if (segments.length === 1) {
    if (method === 'GET') {
      return listProjectResources(request, activity)
    }
    if (method === 'POST') {
      return createProjectResource(request, activity)
    }
    return sdkEndpointNotFound()
  }

  if (segments.length === 2) {
    return method === 'GET'
      ? getProjectResource(request, segments[1], activity)
      : sdkEndpointNotFound()
  }

  if (segments.length === 3 && segments[2] === 'configuration') {
    return method === 'GET'
      ? getProjectConfiguration(request, segments[1], activity)
      : sdkEndpointNotFound()
  }

  if (segments.length === 3 && segments[2] === 'settings') {
    return method === 'PATCH'
      ? updateProjectSettingsResource(request, segments[1], activity)
      : sdkEndpointNotFound()
  }

  if (segments.length === 3 && segments[2] === 'prewarm') {
    return method === 'POST'
      ? prewarmProjectImagesResource(request, segments[1], activity)
      : sdkEndpointNotFound()
  }

  if (segments.length === 3 && segments[2] === 'domains') {
    if (method === 'POST') {
      return addProjectDomain(request, segments[1], activity)
    }
    if (method === 'DELETE') {
      return removeProjectDomain(request, segments[1], activity)
    }
  }

  return sdkEndpointNotFound()
}

function sdkEndpointNotFound() {
  return jsonError('SDK API endpoint not found', 404, {
    code: 'endpoint_not_found',
    resolutionHint:
      'Review the versioned paths and methods published in /openapi.json.',
  })
}
