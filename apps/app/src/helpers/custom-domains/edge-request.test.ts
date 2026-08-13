import {
  signTransformRequest,
  verifyTransformSignature,
} from '@keenpix/transform'
import { describe, expect, it } from 'vitest'
import {
  EDGE_PROJECT_HEADER,
  getTrustedCustomDomainHostname,
  getTrustedEdgeRequest,
  validateCustomDomainCachePartition,
} from './edge-request'

const secret = 'a-secure-edge-secret-that-is-long-enough'

describe('trusted custom-domain edge request', () => {
  it('accepts the Worker hostname when the shared secret matches', () => {
    const request = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'Images.Customer.com',
        'x-keenpix-edge-secret': secret,
      },
    })

    expect(getTrustedCustomDomainHostname(request, secret)).toBe(
      'images.customer.com',
    )
  })

  it('rejects spoofed secrets and malformed hostnames', () => {
    const spoofed = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'images.customer.com',
        'x-keenpix-edge-secret': 'not-the-worker-secret',
      },
    })
    const malformed = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'https://images.customer.com/path',
        'x-keenpix-edge-secret': secret,
      },
    })

    expect(getTrustedCustomDomainHostname(spoofed, secret)).toBeUndefined()
    expect(getTrustedCustomDomainHostname(malformed, secret)).toBeUndefined()
  })

  it('accepts a project hint only on an authenticated edge request', () => {
    const trusted = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'project.cdn.keenpix.com',
        'x-keenpix-edge-secret': secret,
        [EDGE_PROJECT_HEADER]: 'project_123',
      },
    })
    const spoofed = new Request('https://keenpix.com/img/source', {
      headers: {
        'x-keenpix-custom-host': 'project.cdn.keenpix.com',
        'x-keenpix-edge-secret': 'forged',
        [EDGE_PROJECT_HEADER]: 'victim_123',
      },
    })

    expect(getTrustedEdgeRequest(trusted, secret)).toEqual({
      hostname: 'project.cdn.keenpix.com',
      projectId: 'project_123',
    })
    expect(getTrustedEdgeRequest(spoofed, secret)).toBeUndefined()
  })
})

describe('custom-domain cache partition', () => {
  it('removes the authenticated Worker-only parameter before signature verification', () => {
    const source = 'https://assets.example.com/photo.jpg'
    const params = new URLSearchParams({ q: '80' })
    params.set('sig', signTransformRequest(secret, source, params))
    params.set('__keenpix_edge_host', 'images.customer.com')

    expect(
      validateCustomDomainCachePartition(params, 'images.customer.com'),
    ).toBe(true)
    expect(params.has('__keenpix_edge_host')).toBe(false)
    expect(verifyTransformSignature(secret, source, params)).toBe(true)
  })

  it('rejects missing, mismatched, and direct reserved parameters', () => {
    expect(
      validateCustomDomainCachePartition(
        new URLSearchParams('__keenpix_edge_host=other.example.com'),
        'images.customer.com',
      ),
    ).toBe(false)
    expect(
      validateCustomDomainCachePartition(
        new URLSearchParams('__keenpix_edge_host=images.customer.com'),
      ),
    ).toBe(false)
  })
})
