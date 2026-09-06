// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from './reset-password'

const mocks = vi.hoisted(() => ({
  search: {} as Record<string, unknown>,
  resetPassword: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute:
    () =>
    (options: {
      component: () => ReactNode
      validateSearch: (search: Record<string, unknown>) => unknown
    }) => ({
      options,
      useSearch: () => options.validateSearch(mocks.search),
    }),
  useNavigate: () => mocks.navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) =>
    createElement('a', { href: to }, children),
}))
vi.mock('@/lib/auth/client', () => ({
  authClient: { resetPassword: mocks.resetPassword },
}))
vi.mock('@/components/app/keenpix-logo', () => ({ KeenpixLogo: () => null }))
vi.mock('@/components/theme/mode-toggle', () => ({ ModeToggle: () => null }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const ResetPasswordPage = Route.options.component
if (!ResetPasswordPage) {
  throw new Error('Reset password route must render a page')
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.search = {}
  mocks.resetPassword.mockReset()
  mocks.navigate.mockReset()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('password reset recovery', () => {
  it.each([
    {},
    { token: '' },
    { token: '   ' },
    { error: 'INVALID_TOKEN' },
    { token: 'synthetic-token', error: 'INVALID_TOKEN' },
  ])('offers a new link instead of an unusable form for %j', async (search) => {
    mocks.search = search
    await act(() => root.render(createElement(ResetPasswordPage)))
    expect(container.textContent).toContain(
      'This reset link is invalid or has expired.',
    )
    expect(
      container.querySelector('a[href="/forgot-password"]')?.textContent,
    ).toBe('Request a new reset link')
    expect(container.querySelector('input[type="password"]')).toBeNull()
    expect(mocks.resetPassword).not.toHaveBeenCalled()
  })

  it('keeps the password form available for a valid token', async () => {
    mocks.search = { token: 'synthetic-token' }
    await act(() => root.render(createElement(ResetPasswordPage)))
    expect(container.querySelector('input[type="password"]')).not.toBeNull()
    expect(
      container
        .querySelector('button[type="submit"]')
        ?.hasAttribute('disabled'),
    ).toBe(false)
    expect(container.textContent).not.toContain(
      'This reset link is invalid or has expired.',
    )
  })

  it.each([
    { error: null },
    { error: { code: 'INVALID_TOKEN', message: 'Invalid token' } },
    { error: { code: 'INTERNAL_SERVER_ERROR', message: 'Please try again.' } },
  ])('preserves submission and provides recovery for %j', async (response) => {
    mocks.search = { token: 'synthetic-token' }
    mocks.resetPassword.mockResolvedValue(response)
    await act(() => root.render(createElement(ResetPasswordPage)))
    const input = container.querySelector('input')
    const form = container.querySelector('form')
    if (!(input && form)) {
      throw new Error('Valid reset link must show the password form')
    }
    await act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, 'synthetic-password')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
      await mocks.resetPassword.mock.results[0]?.value
    })
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      newPassword: 'synthetic-password',
      token: 'synthetic-token',
    })
    if (response.error) {
      expect(mocks.navigate).not.toHaveBeenCalled()
      expect(
        container.querySelector('a[href="/forgot-password"]'),
      ).not.toBeNull()
      if (response.error.code === 'INVALID_TOKEN') {
        expect(container.querySelector('input')).toBeNull()
        expect(container.textContent).toContain(
          'This reset link is invalid or has expired.',
        )
      } else {
        expect(container.querySelector('input')).not.toBeNull()
        expect(container.textContent).toContain(response.error.message)
      }
    } else {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login' })
    }
  })
})
