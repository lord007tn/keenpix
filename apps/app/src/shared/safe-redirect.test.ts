import { describe, expect, it } from 'vitest'
import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
  it.each([
    'https://evil.example/phish',
    '//evil.example/phish',
    '/\\\\evil.example/phish',
    '/%5c%5cevil.example/phish',
    '/%255c%255cevil.example/phish',
    '/%25255c%25255cevil.example/phish',
    '/%2f%2fevil.example/phish',
    '/%25252f%25252fevil.example/phish',
    '/dashboard\nLocation:https://evil.example',
    '/%0d%0aLocation:https://evil.example',
  ])('rejects external or parser-ambiguous target %s', (target) => {
    expect(safeRedirect(target)).toBeUndefined()
  })

  it.each([
    ['/app/dashboard?range=30d', '/app/dashboard?range=30d'],
    ['/accept-invite?id=invite_1', '/accept-invite?id=invite_1'],
    ['/verify-email#continue', '/verify-email#continue'],
    ['/app/../app/settings', '/app/settings'],
  ])('normalizes same-origin target %s', (target, expected) => {
    expect(safeRedirect(target)).toBe(expected)
  })
})
