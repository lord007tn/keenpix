import { describe, expect, it } from 'vitest'
import { getErrorContext } from './index'

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
