import os from 'node:os'
import { Agent, fetch as undiciFetch } from 'undici'
import {
  assertSafeOrigin,
  TransformError,
  type ValidatedOrigin,
} from '@/actions/transform/ssrf'
import { getProject } from '@/data-access/projects'
import { insertRequestLog } from '@/data-access/request-logs'
import {
  buildCacheKey,
  cacheControl,
  readCache,
  writeCache,
} from '@/lib/cdn/cache'
import {
  contentTypeFor,
  type Fit,
  type OutputFormat,
  transformImage,
} from '@/lib/sharp/transform'

const FORMATS: OutputFormat[] = ['avif', 'webp', 'jpeg', 'png']
const FITS: Fit[] = ['cover', 'contain', 'fill', 'inside']

/** Max bytes pulled from an origin before refusing (413). A cache MISS buffers
 * the whole origin response in memory, so this bounds the OOM blast radius. */
const MAX_ORIGIN_BYTES =
  Number(process.env.KEENPIX_MAX_ORIGIN_BYTES) || 50 * 1024 * 1024
/** Per-attempt origin fetch timeout. A slow/unresponsive origin yields a 504
 * (gateway timeout), not a generic 500. Override with KEENPIX_ORIGIN_TIMEOUT_MS. */
const ORIGIN_TIMEOUT_MS =
  Number(process.env.KEENPIX_ORIGIN_TIMEOUT_MS) || 10_000
/** Max simultaneous fetch+transform jobs (the memory/CPU-heavy path). Excess
 * requests queue; past MAX_QUEUE we shed load with 503 rather than OOM. */
const MAX_CONCURRENT = Math.max(
  1,
  Number(process.env.KEENPIX_MAX_CONCURRENCY) || Math.max(2, os.cpus().length),
)
const MAX_QUEUE = Math.max(1, Number(process.env.KEENPIX_MAX_QUEUE) || 100)

let active = 0
const waiters: Array<() => void> = []

/** In-flight transforms keyed by cache key — lets identical concurrent MISS
 * requests share a single fetch+encode instead of each repeating the expensive
 * work (e.g. a popular image requested many times at once during a cold cache). */
const inflight = new Map<string, Promise<Buffer>>()

/** Acquire a transform slot, or reject 503 if the queue is saturated. */
function acquireSlot(): Promise<void> {
  if (active < MAX_CONCURRENT) {
    active++
    return Promise.resolve()
  }
  if (waiters.length >= MAX_QUEUE) {
    return Promise.reject(new TransformError('Server busy', 503))
  }
  return new Promise((resolve) => waiters.push(resolve))
}

function releaseSlot(): void {
  const next = waiters.shift()
  if (next) {
    next() // hand the in-flight slot straight to the next waiter
  } else {
    active--
  }
}

function clampInt(
  value: string | null,
  min: number,
  max: number,
): number | undefined {
  if (!value) {
    return
  }
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) {
    return
  }
  return Math.min(max, Math.max(min, n))
}

function negotiateFormat(
  fmtParam: string | null,
  accept: string,
  autoFormat: boolean,
): OutputFormat {
  if (
    fmtParam &&
    fmtParam !== 'auto' &&
    FORMATS.includes(fmtParam as OutputFormat)
  ) {
    return fmtParam as OutputFormat
  }
  // fmt=auto or omitted: negotiate from Accept only when the project allows it;
  // otherwise serve a universally-compatible JPEG.
  if (!autoFormat) {
    return 'jpeg'
  }
  if (accept.includes('image/avif')) {
    return 'avif'
  }
  if (accept.includes('image/webp')) {
    return 'webp'
  }
  return 'jpeg'
}

function logPath(src: string): string {
  try {
    return new URL(src).pathname
  } catch {
    return src.slice(0, 200)
  }
}

/**
 * Map a network-level failure talking to the origin to the right gateway status
 * — never a bare 500 (which reads as "Keenpix crashed"). A timeout/abort is a
 * 504; a refused/reset/other connection error is a 502.
 */
function mapFetchError(err: unknown): TransformError {
  const name = err instanceof Error ? err.name : ''
  const code =
    err instanceof Error ? ((err as { code?: string }).code ?? '') : ''
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

/** Log a server-side (5xx) transform failure with its underlying cause. */
function logServerError(src: string, e: unknown): void {
  const cause =
    e instanceof Error && e.cause
      ? ((e.cause as { message?: string; code?: string }).message ??
        (e.cause as { code?: string }).code)
      : undefined
  console.error(
    `[keenpix] transform failed for ${logPath(src)}: ${e instanceof Error ? e.message : String(e)}${cause ? ` (cause: ${cause})` : ''}`,
  )
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
function makePinnedAgent(origin: ValidatedOrigin): Agent {
  return new Agent({
    connect: {
      // Node's net.connect calls the hook with `{ all: true }` and expects
      // the array form back; older paths use the (err, address, family) form.
      // Support both shapes for safety.
      lookup: (_hostname, options, cb) => {
        if ((options as { all?: boolean }).all) {
          cb(null, [{ address: origin.ip, family: origin.family }])
        } else {
          cb(null, origin.ip, origin.family)
        }
      },
    },
  })
}

/** Read a response body into a Buffer, aborting if it exceeds `max` bytes. */
async function readCapped(res: Response, max: number): Promise<Buffer> {
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
async function fetchOriginImage(
  start: ValidatedOrigin,
  allowedOrigins: string[],
): Promise<Buffer> {
  let current = start
  for (let hop = 0; hop < 4; hop++) {
    const agent = makePinnedAgent(current)
    try {
      let res: Response
      try {
        res = (await undiciFetch(current.url, {
          headers: { 'user-agent': 'keenpix/0.1' },
          redirect: 'manual',
          signal: AbortSignal.timeout(ORIGIN_TIMEOUT_MS),
          dispatcher: agent,
        })) as unknown as Response
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

interface ParsedParams {
  blur?: number
  dpr: number
  fit: Fit
  format: OutputFormat
  height?: number
  quality: number
  width?: number
}

interface PipelineDefaults {
  autoFormat: boolean
  defaultQuality: number
}

function parseParams(
  sp: URLSearchParams,
  accept: string,
  defaults: PipelineDefaults,
): ParsedParams {
  const fitParam = sp.get('fit') ?? 'cover'
  return {
    width: clampInt(sp.get('w'), 1, 5000),
    height: clampInt(sp.get('h'), 1, 5000),
    quality:
      clampInt(sp.get('q'), 30, 100) ??
      Math.min(100, Math.max(30, Math.round(defaults.defaultQuality))),
    dpr: clampInt(sp.get('dpr'), 1, 3) ?? 1,
    blur: clampInt(sp.get('blur'), 0, 1000),
    fit: FITS.includes(fitParam as Fit) ? (fitParam as Fit) : 'cover',
    format: negotiateFormat(sp.get('fmt'), accept, defaults.autoFormat),
  }
}

/**
 * GET /api/keenpix?url=&w=&h=&q=&fmt=&fit=&dpr=&blur=&project=
 * Fetches an origin image, transforms it with sharp, caches to disk, logs the request.
 */
export async function handleTransform(request: Request): Promise<Response> {
  const start = Date.now()
  const sp = new URL(request.url).searchParams
  const src = sp.get('url')

  if (!src) {
    return new Response('Missing ?url', { status: 400 })
  }

  const projectId = sp.get('project')
  if (!projectId) {
    return new Response('Missing ?project', { status: 400 })
  }
  const project = await getProject(projectId)
  if (!project) {
    return new Response('Unknown project', { status: 404 })
  }
  // No API keys: access is gated entirely by the project's origin allowlist
  // (enforced in assertSafeOrigin, which fails closed on an empty list) plus the
  // private-IP/SSRF block.

  const { width, height, quality, dpr, blur, fit, format } = parseParams(
    sp,
    request.headers.get('accept') ?? '',
    {
      autoFormat: project.autoFormat,
      defaultQuality: project.defaultQuality,
    },
  )

  let status = 200
  let cached = false
  let bytesIn = 0
  let bytesOut = 0
  let response: Response

  try {
    const origin = await assertSafeOrigin(src, project.allowedOrigins)
    const key = buildCacheKey({
      projectId: project.id,
      url: src,
      w: width,
      h: height,
      q: quality,
      fmt: format,
      fit,
      dpr,
      blur,
    })

    let out = await readCache(key, format)
    if (out) {
      cached = true
    } else {
      const existing = inflight.get(key)
      if (existing) {
        // A matching transform is already running — await its result. We didn't
        // fetch the origin ourselves, so bytesIn stays 0 for this request's log.
        out = await existing
      } else {
        let producedBytesIn = 0
        const work = (async () => {
          await acquireSlot()
          try {
            const input = await fetchOriginImage(origin, project.allowedOrigins)
            producedBytesIn = input.byteLength
            let result: Awaited<ReturnType<typeof transformImage>>
            try {
              result = await transformImage(input, {
                width,
                height,
                dpr,
                quality,
                format,
                fit,
                blur,
                stripMetadata: project.stripMetadata,
              })
            } catch (err) {
              if (err instanceof TransformError) {
                throw err
              }
              // sharp/libvips couldn't decode it: the origin returned something
              // that isn't a usable image (HTML error page, truncated, bomb).
              throw new TransformError('Origin is not a valid image', 502)
            }
            // Caching is best-effort — a cache-write failure must never turn a
            // successful transform into a 500.
            await writeCache(key, format, result.data).catch((e) => {
              console.error(
                `[keenpix] cache write failed: ${e instanceof Error ? e.message : String(e)}`,
              )
            })
            return result.data
          } finally {
            releaseSlot()
          }
        })()
        inflight.set(key, work)
        try {
          out = await work
          bytesIn = producedBytesIn
        } finally {
          inflight.delete(key)
        }
      }
    }

    bytesOut = out.byteLength
    response = new Response(new Uint8Array(out), {
      status: 200,
      headers: {
        'content-type': contentTypeFor(format),
        'cache-control': cacheControl(),
        'x-keenpix-cache': cached ? 'HIT' : 'MISS',
        // Auto-negotiated format varies on Accept — keep CDNs correct.
        vary: 'Accept',
      },
    })
  } catch (e) {
    status = e instanceof TransformError ? e.status : 500
    if (status >= 500) {
      logServerError(src, e)
    }
    // Only our own TransformError messages are safe to echo back; any other
    // error is an unexpected internal failure — return a generic message so we
    // don't leak sharp/undici/stack internals to the caller.
    response = new Response(
      e instanceof TransformError ? e.message : 'Image transform failed',
      { status },
    )
  }

  // Fire-and-forget logging (don't block the response).
  insertRequestLog({
    orgId: project.orgId,
    projectId: project.id,
    path: logPath(src),
    width,
    quality,
    format,
    status,
    cached,
    latencyMs: Date.now() - start,
    bytesIn,
    bytesOut,
  }).catch(() => {
    // ignore log failures
  })

  return response
}
