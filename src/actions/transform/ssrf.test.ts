import { describe, expect, it } from 'vitest'
import { assertSafeOrigin, isPrivateIp, TransformError } from './ssrf'

describe('isPrivateIp', () => {
  it('flags loopback, private, link-local, CGNAT and multicast/reserved', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.5',
      '192.168.1.1',
      '172.16.0.1',
      '172.31.255.255',
      '169.254.169.254', // cloud metadata
      '0.0.0.0',
      '100.64.0.1', // CGNAT
      '100.127.255.255',
      '224.0.0.1', // multicast
      '239.1.2.3',
      '255.255.255.255',
      '::1',
      'fe80::1', // link-local
      'fea0::1', // link-local (upper)
      'fec0::1', // site-local
      'fc00::1', // unique-local
      'fd12:3456::1',
      'ff02::1', // multicast (all-nodes)
      'ff02::fb', // mDNS
    ]) {
      expect([ip, isPrivateIp(ip)]).toStrictEqual([ip, true])
    }
  })

  it('unwraps IPv4-mapped IPv6 (dotted + hex-compressed) so loopback/private cannot slip through', () => {
    for (const ip of [
      '::ffff:127.0.0.1',
      '::ffff:10.0.0.1',
      '::ffff:169.254.169.254',
      '[::ffff:127.0.0.1]',
      '::ffff:7f00:1', // hex-compressed 127.0.0.1
      '::ffff:a9fe:a9fe', // hex-compressed 169.254.169.254 (metadata)
      '::ffff:0a00:0001', // hex-compressed 10.0.0.1
    ]) {
      expect([ip, isPrivateIp(ip)]).toStrictEqual([ip, true])
    }
  })

  it('allows genuine public addresses', () => {
    for (const ip of [
      '8.8.8.8',
      '1.1.1.1',
      '151.101.1.140',
      '93.184.216.34',
      '172.15.0.1', // just below the private 172.16/12 block
      '172.32.0.1', // just above it
      '100.63.255.255', // just below CGNAT
      '100.128.0.1', // just above CGNAT
      '2606:4700:4700::1111',
    ]) {
      expect([ip, isPrivateIp(ip)]).toStrictEqual([ip, false])
    }
  })
})

describe('assertSafeOrigin — pre-DNS validation', () => {
  async function statusOf(p: Promise<unknown>): Promise<number | string> {
    try {
      await p
      return 'no-throw'
    } catch (e) {
      return e instanceof TransformError ? e.status : 'other-error'
    }
  }

  it('rejects non-http(s) protocols with 400', async () => {
    expect(await statusOf(assertSafeOrigin('ftp://example.com/x', []))).toBe(
      400,
    )
    expect(await statusOf(assertSafeOrigin('file:///etc/passwd', []))).toBe(400)
  })

  it('rejects malformed URLs with 400', async () => {
    expect(await statusOf(assertSafeOrigin('not a url', []))).toBe(400)
  })

  it('rejects origins outside the allowlist with 403', async () => {
    expect(
      await statusOf(assertSafeOrigin('http://evil.com/x', ['good.com'])),
    ).toBe(403)
  })

  it('fails closed on an empty allowlist (403, no open proxy)', async () => {
    expect(await statusOf(assertSafeOrigin('http://anything.com/x', []))).toBe(
      403,
    )
  })
})
