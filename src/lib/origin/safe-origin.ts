import { lookup } from 'node:dns/promises'
import net from 'node:net'
import { TransformError } from '@/errors/transform'

// Hoisted (biome perf): compiled once at module load, not per call.
const BRACKET_OPEN_RE = /^\[/
const BRACKET_CLOSE_RE = /\]$/
const ZONE_ID_RE = /%.*$/
const MAPPED_V4_RE = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/
// Hex-compressed IPv4-mapped form, e.g. ::ffff:7f00:1 === 127.0.0.1.
const HEX_MAPPED_V4_RE = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/
// fe80::/10 link-local + fec0::/10 site-local (deprecated but still routed).
const LINK_SITE_LOCAL_RE = /^fe[89a-f]/

export interface SafeOrigin {
  family: 4 | 6
  ip: string
  url: URL
}

export function isPrivateIp(ip: string) {
  // Normalize: drop brackets + IPv6 zone id, lowercase.
  let addr = ip
    .toLowerCase()
    .trim()
    .replace(BRACKET_OPEN_RE, '')
    .replace(BRACKET_CLOSE_RE, '')
    .replace(ZONE_ID_RE, '')
  // Unwrap IPv4-mapped/-compatible IPv6 (e.g. ::ffff:127.0.0.1) to the IPv4 so a
  // malicious AAAA record can't smuggle a loopback/private address past the check.
  const mapped = addr.match(MAPPED_V4_RE)
  if (mapped) {
    addr = mapped[1]
  }
  // Unwrap the hex-compressed mapped form (::ffff:7f00:1) the dotted regex misses.
  const hexMapped = addr.match(HEX_MAPPED_V4_RE)
  if (hexMapped) {
    const hi = Number.parseInt(hexMapped[1], 16)
    const lo = Number.parseInt(hexMapped[2], 16)
    addr = `${Math.floor(hi / 256)}.${hi % 256}.${Math.floor(lo / 256)}.${lo % 256}`
  }
  if (net.isIPv4(addr)) {
    const [a, b] = addr.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
      a >= 224 // multicast / reserved
    )
  }
  return (
    addr === '::1' ||
    addr === '::' ||
    addr.startsWith('ff') || // multicast ff00::/8
    addr.startsWith('fc') || // unique-local fc00::/7
    addr.startsWith('fd') ||
    LINK_SITE_LOCAL_RE.test(addr) // link-local + site-local
  )
}

/**
 * Validates a fetch target before we touch it:
 * - http(s) only
 * - host must be on the project allowlist (if any)
 * - resolves DNS once, blocks private/loopback/link-local IPs,
 *   and returns the resolved IP so the caller can pin the fetch to that IP
 *   (closes the DNS-rebinding TOCTOU window).
 */
export async function assertSafeOrigin(
  rawUrl: string,
  allowedOrigins: string[],
): Promise<SafeOrigin> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new TransformError('Invalid url', 400)
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TransformError('Only http(s) origins are allowed', 400)
  }

  // Fail closed: with no API keys, the allowlist IS the access control, so an
  // empty allowlist must deny everything (not act as an open proxy).
  if (allowedOrigins.length === 0) {
    throw new TransformError(
      'No allowed origins are configured for this project',
      403,
    )
  }
  const allowed = allowedOrigins.some(
    (o) => url.hostname === o || url.hostname.endsWith(`.${o}`),
  )
  if (!allowed) {
    throw new TransformError(`Origin ${url.hostname} is not allowed`, 403)
  }

  // Prefer IPv4 (universally routable from most environments); fall back to
  // IPv6 only if the host has no A record.
  let address: string
  let family: 4 | 6
  try {
    try {
      const v4 = await lookup(url.hostname, { family: 4 })
      address = v4.address
      family = 4
    } catch {
      const any = await lookup(url.hostname)
      address = any.address
      family = any.family === 6 ? 6 : 4
    }
  } catch {
    throw new TransformError('Could not resolve origin', 502)
  }
  if (isPrivateIp(address)) {
    throw new TransformError('Origin resolves to a private address', 403)
  }
  return { url, ip: address, family }
}
