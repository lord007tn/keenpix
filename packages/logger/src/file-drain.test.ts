import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createLogger, flushLogger, initializeLogger } from './index'

let logDir: string | undefined

afterEach(async () => {
  if (logDir) {
    await rm(logDir, { force: true, recursive: true })
  }
})

describe('file drain', () => {
  it('flushes redacted structured errors as NDJSON', async () => {
    logDir = await mkdtemp(join(tmpdir(), 'keenpix-evlog-'))
    initializeLogger({
      environment: 'production',
      logDir,
      service: 'keenpix-logger-test',
    })

    createLogger({ component: 'logger-test' }).error(
      {
        apiKey: 'keenpix-secret-key',
        error: new Error('drain failed'),
      },
      'logger drain test',
    )
    await flushLogger()

    const files = (await readdir(logDir)).filter((file) =>
      file.endsWith('.jsonl'),
    )
    expect(files).toHaveLength(1)
    const contents = await readFile(join(logDir, files[0] ?? ''), 'utf8')
    const events = contents
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      apiKey: '[REDACTED]',
      component: 'logger-test',
      error: {
        error: 'drain failed',
        name: 'Error',
      },
      level: 'error',
      message: 'logger drain test',
      service: 'keenpix-logger-test',
    })
    expect(events[0].error.stack).toContain('drain failed')
  })
})
