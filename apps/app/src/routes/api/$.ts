import { createFileRoute } from '@tanstack/react-router'
import { jsonError } from './sdk/-sdk/responses'

export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      DELETE: unknownApiEndpoint,
      GET: unknownApiEndpoint,
      PATCH: unknownApiEndpoint,
      POST: unknownApiEndpoint,
      PUT: unknownApiEndpoint,
    },
  },
})

function unknownApiEndpoint() {
  return jsonError('API endpoint not found', 404, {
    code: 'endpoint_not_found',
    resolutionHint:
      'Review the public operations and methods published in /openapi.json.',
  })
}
