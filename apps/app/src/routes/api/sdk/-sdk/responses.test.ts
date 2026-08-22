import { describe, expect, it } from 'vitest'
import { jsonError } from './responses'

describe('SDK JSON errors', () => {
  it('adds machine-readable fields without removing the legacy error string', async () => {
    const response = jsonError('Missing API key', 401, {
      code: 'missing_api_key',
      resolutionHint: 'Send a project-scoped API key.',
    })

    expect(response.status).toBe(401)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('cache-control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: 'Missing API key',
      code: 'missing_api_key',
      message: 'Missing API key',
      resolution_hint: 'Send a project-scoped API key.',
    })
  })
})
