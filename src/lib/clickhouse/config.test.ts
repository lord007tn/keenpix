import { afterEach, describe, expect, it, vi } from 'vitest'

// Load config.ts with a controlled env so the gating can be asserted in
// isolation. vi.doMock (not hoisted) must run before the dynamic import.
async function loadConfig(env: Record<string, unknown>) {
  vi.resetModules()
  vi.doMock('@/env/server', () => ({ env }))
  return await import('./config')
}

afterEach(() => {
  vi.doUnmock('@/env/server')
  vi.resetModules()
})

describe('getClickhouseConfig', () => {
  it('returns null when CLICKHOUSE_URL is unset (Postgres-only)', async () => {
    const { getClickhouseConfig, clickhouseEnabled } = await loadConfig({
      CLICKHOUSE_DATABASE: 'keenpix',
      CLICKHOUSE_USER: 'default',
    })
    expect(getClickhouseConfig()).toBeNull()
    expect(clickhouseEnabled()).toBe(false)
  })

  it('resolves the connection config when CLICKHOUSE_URL is set', async () => {
    const { getClickhouseConfig, clickhouseEnabled } = await loadConfig({
      CLICKHOUSE_URL: 'http://localhost:8123',
      CLICKHOUSE_DATABASE: 'keenpix',
      CLICKHOUSE_USER: 'default',
      CLICKHOUSE_PASSWORD: 'secret',
    })
    expect(clickhouseEnabled()).toBe(true)
    expect(getClickhouseConfig()).toEqual({
      url: 'http://localhost:8123',
      database: 'keenpix',
      username: 'default',
      password: 'secret',
    })
  })

  it('defaults the password to an empty string when unset', async () => {
    const { getClickhouseConfig } = await loadConfig({
      CLICKHOUSE_URL: 'http://localhost:8123',
      CLICKHOUSE_DATABASE: 'keenpix',
      CLICKHOUSE_USER: 'default',
    })
    expect(getClickhouseConfig()?.password).toBe('')
  })
})
