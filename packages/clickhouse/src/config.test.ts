import { afterEach, describe, expect, it, vi } from 'vitest'
import { clickhouseEnabled, getClickhouseConfig } from './config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getClickhouseConfig', () => {
  it('returns null when CLICKHOUSE_URL is unset', () => {
    vi.stubEnv('CLICKHOUSE_URL', '')
    expect(getClickhouseConfig()).toBeNull()
    expect(clickhouseEnabled()).toBe(false)
  })

  it('resolves the configured connection', () => {
    vi.stubEnv('CLICKHOUSE_URL', 'http://localhost:8123')
    vi.stubEnv('CLICKHOUSE_DATABASE', 'keenpix_test')
    vi.stubEnv('CLICKHOUSE_USER', 'default')
    vi.stubEnv('CLICKHOUSE_PASSWORD', 'secret')

    expect(getClickhouseConfig()).toEqual({
      url: 'http://localhost:8123',
      database: 'keenpix_test',
      username: 'default',
      password: 'secret',
    })
  })

  it('uses safe defaults for optional fields', () => {
    vi.stubEnv('CLICKHOUSE_URL', 'http://localhost:8123')
    vi.stubEnv('CLICKHOUSE_DATABASE', '')
    vi.stubEnv('CLICKHOUSE_USER', '')
    vi.stubEnv('CLICKHOUSE_PASSWORD', '')

    expect(getClickhouseConfig()).toEqual({
      url: 'http://localhost:8123',
      database: '',
      username: '',
      password: '',
    })
  })
})
