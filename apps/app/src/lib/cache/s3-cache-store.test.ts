import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
vi.mock('aws4fetch', () => ({
  AwsClient: class {
    fetch = fetchMock
  },
}))

const { S3CacheStore } = await import('./s3-cache-store')

const config = {
  accessKeyId: 'k',
  secretAccessKey: 's',
  bucket: 'keenpix-cache',
  endpoint: 'https://acct.r2.cloudflarestorage.com',
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('S3CacheStore', () => {
  it('writes a variant to a content-addressed object key with size/time metadata', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    const store = new S3CacheStore(config)
    await store.set('abc123', 'webp', Buffer.from('img'), 4096)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(
      'https://acct.r2.cloudflarestorage.com/keenpix-cache/abc123.webp',
    )
    expect(init.method).toBe('PUT')
    expect(init.headers['x-amz-meta-originalbytes']).toBe('4096')
  })

  it('reads back the buffer + originalBytes/createdAt from object metadata', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      headers: new Map([
        ['x-amz-meta-originalbytes', '9000'],
        ['x-amz-meta-createdat', '1700000000000'],
      ]),
    })
    const store = new S3CacheStore(config)
    // jpeg maps to the .jpg extension, avif stays avif.
    const entry = await store.getEntry('abc123', 'avif')
    expect(entry?.originalBytes).toBe(9000)
    expect(entry?.createdAt).toBe(1_700_000_000_000)
    expect(Array.from(entry?.data ?? [])).toEqual([1, 2, 3])
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://acct.r2.cloudflarestorage.com/keenpix-cache/abc123.avif',
    )
  })

  it('returns null on a miss', async () => {
    fetchMock.mockResolvedValue({ ok: false })
    const store = new S3CacheStore(config)
    expect(await store.get('missing', 'jpeg')).toBeNull()
    expect(store.stats().s3Misses).toBe(1)
  })
})
