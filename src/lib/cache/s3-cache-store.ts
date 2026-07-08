import { AwsClient } from 'aws4fetch'
import type { OutputFormat } from '@/shared/transform'
import type { CacheEntry, CacheStore } from './cache-store'

const TRAILING_SLASHES = /\/+$/

const EXT: Record<OutputFormat, string> = {
  avif: 'avif',
  gif: 'gif',
  heif: 'heif',
  jpeg: 'jpg',
  png: 'png',
  svg: 'svg',
  tiff: 'tiff',
  webp: 'webp',
}

export interface S3CacheConfig {
  accessKeyId: string
  bucket: string
  // Object-storage endpoint, e.g. https://<account>.r2.cloudflarestorage.com
  endpoint: string
  region?: string
  secretAccessKey: string
}

// Durable cache tier for horizontally-scaled cloud replicas: every transformed
// variant lives in one shared S3/R2 bucket, so all instances share the same warm
// cache instead of each keeping its own disk copy. Content-addressed keys already
// include projectId, so variants are globally unique and tenant-safe. No eviction
// here — bucket lifecycle rules (or unbounded) handle retention at object scale.
export class S3CacheStore implements CacheStore {
  private readonly client: AwsClient
  private readonly base: string
  private hits = 0
  private misses = 0
  private writes = 0

  constructor(config: S3CacheConfig) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region ?? 'auto',
      service: 's3',
    })
    this.base = `${config.endpoint.replace(TRAILING_SLASHES, '')}/${config.bucket}`
  }

  private objectUrl(key: string, format: OutputFormat): string {
    return `${this.base}/${key}.${EXT[format]}`
  }

  async get(key: string, format: OutputFormat): Promise<Buffer | null> {
    const entry = await this.getEntry(key, format)
    return entry?.data ?? null
  }

  async getEntry(
    key: string,
    format: OutputFormat,
  ): Promise<CacheEntry | null> {
    const res = await this.client.fetch(this.objectUrl(key, format))
    if (!res.ok) {
      this.misses += 1
      return null
    }
    this.hits += 1
    const data = Buffer.from(await res.arrayBuffer())
    // originalBytes/createdAt travel as object metadata so a cache hit can still
    // book its compression saving without refetching the origin (mirrors how the
    // disk store encodes originalBytes into the filename).
    const originalBytes = Number(res.headers.get('x-amz-meta-originalbytes'))
    const createdAt = Number(res.headers.get('x-amz-meta-createdat'))
    return {
      data,
      originalBytes: Number.isFinite(originalBytes) ? originalBytes : 0,
      createdAt:
        Number.isFinite(createdAt) && createdAt > 0 ? createdAt : Date.now(),
    }
  }

  async set(
    key: string,
    format: OutputFormat,
    data: Buffer,
    originalBytes = 0,
  ): Promise<void> {
    await this.client.fetch(this.objectUrl(key, format), {
      method: 'PUT',
      // aws4fetch hashes the body to sign the request, so pass raw bytes. The
      // cast bridges Buffer/Uint8Array to the fetch BodyInit union, which TS
      // narrows too aggressively for the generic ArrayBufferLike backing type.
      body: new Uint8Array(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ) as BodyInit,
      headers: {
        'content-type': `image/${format}`,
        'x-amz-meta-originalbytes': String(originalBytes),
        'x-amz-meta-createdat': String(Date.now()),
      },
    })
    this.writes += 1
  }

  stats(): Record<string, number> {
    return { s3Hits: this.hits, s3Misses: this.misses, s3Writes: this.writes }
  }
}
