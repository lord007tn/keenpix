import { describe, expect, it } from 'vitest'
import { getErrorContext, getLogContext, runWithLogContext } from './index'

describe('getErrorContext', () => {
  it('normalizes errors without exposing stacks by default', () => {
    const context = getErrorContext(
      new Error('outer', { cause: new TypeError('inner') }),
    )

    expect(context).toMatchObject({
      cause: { message: 'inner', name: 'TypeError' },
      error: 'outer',
      name: 'Error',
      stack: undefined,
    })
  })

  it('normalizes non-error values', () => {
    expect(getErrorContext('failed')).toEqual({ error: 'failed' })
  })
})

describe('log context', () => {
  it('isolates correlation across concurrent operations', async () => {
    const requestIds = await Promise.all(
      ['request-a', 'request-b'].map((requestId) =>
        runWithLogContext({ requestId }, async () => {
          await Promise.resolve()
          return getLogContext()?.requestId
        }),
      ),
    )

    expect(requestIds).toEqual(['request-a', 'request-b'])
    expect(getLogContext()).toBeUndefined()
  })

  it('merges nested correlation without leaking it afterward', () => {
    runWithLogContext({ requestId: 'request-a' }, () => {
      runWithLogContext({ jobId: 'job-a' }, () => {
        expect(getLogContext()).toEqual({
          jobId: 'job-a',
          requestId: 'request-a',
        })
      })
    })

    expect(getLogContext()).toBeUndefined()
  })
})
