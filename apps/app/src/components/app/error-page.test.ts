import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteError, ServerErrorPage } from './error-page'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) =>
    createElement('a', null, children),
  useRouter: () => ({ invalidate: vi.fn() }),
}))
vi.mock('@/components/app/keenpix-logo', () => ({ KeenpixLogo: () => null }))
vi.mock('@/components/theme/mode-toggle', () => ({ ModeToggle: () => null }))

afterEach(() => vi.unstubAllEnvs())

describe.each([
  [ServerErrorPage, 'An unexpected error occurred while loading this page.'],
  [
    RouteError,
    'An unexpected error occurred. Try again, or head back to your dashboard.',
  ],
] as const)('unknown errors in %s', (component, fallback) => {
  it.each([
    undefined,
    null,
    false,
    0,
    '',
    'failure',
    { message: 42 },
  ])('renders the fallback for a non-message error (%s)', (error) => {
    vi.stubEnv('DEV', true)

    const html = renderToStaticMarkup(
      createElement(component, { error, reset: vi.fn() }),
    )

    expect(html).toContain(fallback)
  })

  it.each([
    new Error('local detail'),
    { message: 'local detail' },
  ])('retains a string message during development', (error) => {
    vi.stubEnv('DEV', true)

    const html = renderToStaticMarkup(
      createElement(component, { error, reset: vi.fn() }),
    )

    expect(html).toContain('local detail')
  })

  it('does not disclose server details in production', () => {
    vi.stubEnv('DEV', false)

    const html = renderToStaticMarkup(
      createElement(component, {
        error: new Error('private server detail'),
        reset: vi.fn(),
      }),
    )

    expect(html).toContain(fallback)
    expect(html).not.toContain('private server detail')
  })
})
