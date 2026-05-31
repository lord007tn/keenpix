import { Agent, fetch as undiciFetch } from 'undici'
import { env } from '@/env/server'
import { TransformError } from '@/errors/transform'
import { assertSafeOrigin } from './safe-origin'

type ValidatedOrigin = Awaited<ReturnType<typeof assertSafeOrigin>>
type OriginResponse = Awaited<ReturnType<typeof undiciFetch>>

/** Max bytes pulled from an origin before refusing (413). A cache MISS buffers
 * the whole origin response in memory, so this bounds the OOM blast radius. */
const MAX_ORIGIN_BYTES = env.KEENPIX_MAX_ORIGIN_BYTES
/** Per-attempt origin fetch timeout. A slow/unresponsive origin yields a 504
 * (gateway timeout), not a generic 500. Override with KEENPIX_ORIGIN_TIMEOUT_MS. */
const ORIGIN_TIMEOUT_MS = env.KEENPIX_ORIGIN_TIMEOUT_MS

/**
 * Map a network-level failure talking to the origin to the right gateway status
 * — never a bare 500 (which reads as "Keenpix crashed"). A timeout/abort is a
 * 504; a refused/reset/other connection error is a 502.
 */
function mapFetchError(err: unknown) {
  const name = err instanceof Error ? err.name : ''
  const code =
    err instanceof Error && 'code' in err ? Reflect.get(err, 'code') : ''
  if (
    name === 'TimeoutError' ||
    name === 'AbortError' ||
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_BODY_TIMEOUT'
  ) {
    return new TransformError('Origin timed out', 504)
  }
  return new TransformError('Origin fetch failed', 502)
}

/**
 * Fetch the origin image with the **resolved IP pinned** into the dispatcher
 * (closes the DNS-rebinding TOCTOU window — the host can't flip to an internal
 * IP between our DNS check and the actual TCP connect). Every redirect hop is
 * re-validated through assertSafeOrigin, so a 302 to an internal host fails.
 *
 * TLS SNI + HTTP Host header both still use the original hostname (set by fetch
 * from the URL), so certificate validation works normally for HTTPS origins.
 */
function makePinnedAgent(origin: ValidatedOrigin) {
  return new Agent({
    connect: {
      // Node's net.connect calls the hook with `{ all: true }` and expects
      // the array form back; older paths use the (err, address, family) form.
      // Support both shapes for safety.
      lookup: (_hostname, options, cb) => {
        if (Reflect.get(options, 'all')) {
          cb(null, [{ address: origin.ip, family: origin.family }])
        } else {
          cb(null, origin.ip, origin.family)
        }
      },
    },
  })
}

/** Read a response body into a Buffer, aborting if it exceeds `max` bytes. */
async function readCapped(res: OriginResponse, max: number) {
  const body = res.body
  if (!body) {
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength > max) {
      throw new TransformError('Origin image too large', 413)
    }
    return buf
  }
  const reader = body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > max) {
      await reader.cancel().catch(() => {
        // already aborting
      })
      throw new TransformError('Origin image too large', 413)
    }
    chunks.push(Buffer.from(value))
  }
  return Buffer.concat(chunks)
}

/**
 * Fetch the origin image with the **resolved IP pinned** into the dispatcher
 * (closes the DNS-rebinding TOCTOU window — the host can't flip to an internal
 * IP between our DNS check and the actual TCP connect). Every redirect hop is
 * re-validated through assertSafeOrigin, so a 302 to an internal host fails, and
 * each hop's Agent is closed in finally so the socket pool can't leak under load.
 *
 * TLS SNI + HTTP Host header both still use the original hostname (set by fetch
 * from the URL), so certificate validation works normally for HTTPS origins.
 */
export async function fetchOriginImage(
  start: ValidatedOrigin,
  allowedOrigins: string[],
) {
  let current = start
  for (let hop = 0; hop < 4; hop++) {
    const agent = makePinnedAgent(current)
    try {
      let res: OriginResponse
      try {
        res = await undiciFetch(current.url, {
          headers: { 'user-agent': 'keenpix/0.1' },
          redirect: 'manual',
          signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
          dispatcher: agent,
        })
      } catch (err) {
        // Network-level failure (timeout, refused, reset, DNS) reaching the
        // origin — a gateway problem, surfaced as 504/502, never a bare 500.
        throw mapFetchError(err)
      }

      if (res.status >= 300 && res.status < 400) {
        // Discard the redirect body WITHOUT buffering it — it can be arbitrarily
        // large and bypasses the size cap if read via arrayBuffer().
        await res.body?.cancel().catch(() => {
          // ignore
        })
        const loc = res.headers.get('location')
        if (!loc) {
          throw new TransformError(`Origin responded ${res.status}`, 502)
        }
        current = await assertSafeOrigin(
          new URL(loc, current.url).toString(),
          allowedOrigins,
        )
        continue
      }
      if (!res.ok) {
        await res.body?.cancel().catch(() => {
          // ignore
        })
        throw new TransformError(`Origin responded ${res.status}`, 502)
      }
      // Content-Length can lie or be absent; readCapped enforces the real ceiling.
      const declared = Number(res.headers.get('content-length'))
      if (Number.isFinite(declared) && declared > MAX_ORIGIN_BYTES) {
        await res.body?.cancel().catch(() => {
          // ignore
        })
        throw new TransformError('Origin image too large', 413)
      }
      return await readCapped(res, MAX_ORIGIN_BYTES)
    } finally {
      // destroy() (not close()) so a half-read or errored body never pins the
      // socket — and thus a concurrency slot — until the AbortSignal fires.
      agent.destroy().catch(() => {
        // ignore
      })
    }
  }
  throw new TransformError('Too many redirects', 502)
}
