import { Agent as HttpAgent } from 'node:http'
import { Agent as HttpsAgent } from 'node:https'
import type { Response } from 'got'
import got from 'got'
import { LRUCache } from 'lru-cache'
import { env } from '@/env/server'
import { TransformError } from '@/errors/transform'
import { assertSafeOrigin, type SafeOrigin } from './safe-origin'

/** Max bytes pulled from an origin before refusing (413). A cache MISS buffers
 * the whole origin response in memory, so this bounds the OOM blast radius. */
const MAX_ORIGIN_BYTES = env.KEENPIX_MAX_ORIGIN_BYTES
/** Per-attempt origin fetch timeout. A slow/unresponsive origin yields a 504
 * (gateway timeout), not a generic 500. Override with KEENPIX_ORIGIN_TIMEOUT_MS. */
const ORIGIN_TIMEOUT_MS = env.KEENPIX_ORIGIN_TIMEOUT_MS
const ORIGIN_AGENT_CACHE_MAX = 64

const originAgents = new LRUCache<
  string,
  { http: HttpAgent; https: HttpsAgent }
>({
  max: ORIGIN_AGENT_CACHE_MAX,
  dispose: (agents) => {
    agents.http.destroy()
    agents.https.destroy()
  },
})

/**
 * Map a network-level failure talking to the origin to the right gateway status
 * — never a bare 500 (which reads as "Keenpix crashed"). A timeout/abort is a
 * 504; a refused/reset/other connection error is a 502.
 */
function mapFetchError(err: unknown) {
  const name = err instanceof Error ? err.name : ''
  const code =
    err instanceof Error && 'code' in err ? Reflect.get(err, 'code') : ''
  if (name === 'TimeoutError' || code === 'ETIMEDOUT') {
    return new TransformError('Origin timed out', 504)
  }
  if (code === 'ERR_MAX_BODY_SIZE') {
    return new TransformError('Origin image too large', 413)
  }
  return new TransformError('Origin fetch failed', 502)
}

function pinnedLookup(origin: SafeOrigin) {
  return (_hostname: string, options: unknown, cb?: unknown) => {
    if (typeof options === 'function') {
      options(null, origin.ip, origin.family)
      return
    }
    if (typeof cb === 'function') {
      if (Reflect.get(options ?? {}, 'all')) {
        cb(null, [{ address: origin.ip, family: origin.family }])
      } else {
        cb(null, origin.ip, origin.family)
      }
    }
  }
}

function agentKey(origin: SafeOrigin) {
  return [
    origin.url.protocol,
    origin.url.hostname,
    origin.url.port,
    origin.ip,
    origin.family,
  ].join('|')
}

function getPinnedAgents(origin: SafeOrigin) {
  const key = agentKey(origin)
  const agents = originAgents.get(key)
  if (agents) {
    return agents
  }
  const next = {
    http: new HttpAgent({ keepAlive: true, lookup: pinnedLookup(origin) }),
    https: new HttpsAgent({ keepAlive: true, lookup: pinnedLookup(origin) }),
  }
  originAgents.set(key, next)
  return next
}

function requestOrigin(origin: SafeOrigin) {
  return got.stream(origin.url, {
    agent: getPinnedAgents(origin),
    dnsLookup: pinnedLookup(origin),
    followRedirect: false,
    headers: { 'user-agent': 'keenpix/0.1' },
    retry: { limit: 0 },
    throwHttpErrors: false,
    timeout: { request: ORIGIN_TIMEOUT_MS },
  })
}

async function readCapped(
  stream: ReturnType<typeof requestOrigin>,
  max: number,
) {
  const chunks: Buffer[] = []
  let total = 0

  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buf.byteLength
    if (total > max) {
      stream.destroy()
      throw new TransformError('Origin image too large', 413)
    }
    chunks.push(buf)
  }

  return Buffer.concat(chunks)
}

function readResponse(stream: ReturnType<typeof requestOrigin>) {
  return new Promise<Response>((resolve, reject) => {
    stream.once('response', resolve)
    stream.once('error', reject)
  })
}

/**
 * Fetch the origin image with the resolved IP pinned into DNS lookup
 * (closes the DNS-rebinding TOCTOU window — the host can't flip to an internal
 * IP between our DNS check and the actual TCP connect). Every redirect hop is
 * re-validated through assertSafeOrigin, so a 302 to an internal host fails, and
 *
 * TLS SNI + HTTP Host header both still use the original hostname from the URL,
 * so certificate validation works normally for HTTPS origins.
 */
export async function fetchOriginImage(
  start: SafeOrigin,
  allowedOrigins: string[],
) {
  let current = start
  for (let hop = 0; hop < 4; hop++) {
    try {
      const stream = requestOrigin(current)
      const res = await readResponse(stream)

      if (res.statusCode >= 300 && res.statusCode < 400) {
        stream.destroy()
        const loc = res.headers.location
        if (!loc) {
          throw new TransformError(`Origin responded ${res.statusCode}`, 502)
        }
        current = await assertSafeOrigin(
          new URL(loc, current.url).toString(),
          allowedOrigins,
        )
        continue
      }
      if (!res.ok) {
        stream.destroy()
        throw new TransformError(`Origin responded ${res.statusCode}`, 502)
      }
      // Content-Length can lie or be absent; readCapped enforces the real ceiling.
      const declared = Number(res.headers['content-length'])
      if (Number.isFinite(declared) && declared > MAX_ORIGIN_BYTES) {
        stream.destroy()
        throw new TransformError('Origin image too large', 413)
      }
      return await readCapped(stream, MAX_ORIGIN_BYTES)
    } catch (error) {
      if (error instanceof TransformError) {
        throw error
      }
      throw mapFetchError(error)
    }
  }
  throw new TransformError('Too many redirects', 502)
}
