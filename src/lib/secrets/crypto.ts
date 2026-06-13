import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import { env } from '@/env/server'

// Symmetric encryption for secrets stored at rest (e.g. the Cloudflare API
// token in CloudflareSettings). The key is derived from BETTER_AUTH_SECRET, so
// no extra secret to manage — but rotating BETTER_AUTH_SECRET invalidates any
// previously-encrypted value, which then has to be re-entered.
const PREFIX = 'enc.v1:'
const IV_BYTES = 12
const TAG_BYTES = 16

let cachedKey: Buffer | undefined

function key() {
  if (cachedKey) {
    return cachedKey
  }
  const secret = env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is required to encrypt stored secrets.')
  }
  cachedKey = scryptSync(secret, 'keenpix.secret.v1', 32)
  return cachedKey
}

// Returns a self-describing payload (`enc.v1:` + base64 of iv|tag|ciphertext)
// so decryptSecret can detect format and any plaintext legacy value is left
// untouched.
export function encryptSecret(plain: string) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptSecret(payload: string) {
  if (!payload.startsWith(PREFIX)) {
    // Not encrypted by us — return as-is so a value set before encryption (or a
    // plaintext env value) still works.
    return payload
  }
  const raw = Buffer.from(payload.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}
