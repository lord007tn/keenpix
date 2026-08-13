import type { CacheEntry } from './cache-store'

const METADATA_BYTES = 16

export function encodeCacheEntry(entry: CacheEntry) {
  const bytes = Buffer.allocUnsafe(METADATA_BYTES + entry.data.byteLength)
  bytes.writeBigUInt64BE(BigInt(entry.createdAt), 0)
  bytes.writeBigUInt64BE(BigInt(entry.originalBytes), 8)
  entry.data.copy(bytes, METADATA_BYTES)
  return bytes
}

export function decodeCacheEntry(raw: Buffer | Uint8Array | null | undefined) {
  if (!(raw && raw.byteLength > METADATA_BYTES)) {
    return null
  }
  const bytes = Buffer.from(raw)
  return {
    createdAt: Number(bytes.readBigUInt64BE(0)),
    data: bytes.subarray(METADATA_BYTES),
    originalBytes: Number(bytes.readBigUInt64BE(8)),
  }
}
