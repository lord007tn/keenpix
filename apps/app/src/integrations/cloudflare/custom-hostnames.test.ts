import { describe, expect, it } from 'vitest'
import { getCloudflareCustomHostnameState } from './custom-hostnames'

describe('Cloudflare custom hostname state', () => {
  it('marks the hostname ready only when DNS and TLS are active', () => {
    expect(
      getCloudflareCustomHostnameState({
        hostname: 'images.example.com',
        id: 'hostname_1',
        status: 'active',
        ssl: { status: 'active' },
      }),
    ).toEqual({
      dnsStatus: 'verified',
      lastError: null,
      sslStatus: 'active',
      verified: true,
    })
  })

  it('keeps non-terminal provisioning pending', () => {
    expect(
      getCloudflareCustomHostnameState({
        hostname: 'images.example.com',
        id: 'hostname_1',
        status: 'pending',
        ssl: { status: 'pending_validation' },
      }),
    ).toMatchObject({
      dnsStatus: 'pending',
      sslStatus: 'provisioning',
      verified: false,
    })
  })

  it('surfaces provider validation errors', () => {
    expect(
      getCloudflareCustomHostnameState({
        hostname: 'images.example.com',
        id: 'hostname_1',
        status: 'pending',
        verification_errors: ['CNAME target was not found'],
      }),
    ).toMatchObject({
      dnsStatus: 'error',
      lastError: 'CNAME target was not found',
    })
  })
})
