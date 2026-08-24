// @vitest-environment jsdom

import { runInNewContext } from 'node:vm'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  ScriptOnce: ({ children }: { children: string }) =>
    createElement('script', { 'data-script-once': true }, children),
}))

import { getThemeScript, ThemeProvider, useTheme } from './theme-provider'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let prefersDark = false
const mediaListeners = new Set<() => void>()

function ThemeProbe() {
  const { resolvedTheme, setTheme, theme } = useTheme()

  return createElement(
    'button',
    {
      'data-resolved-theme': resolvedTheme,
      'data-theme': theme,
      onClick: () => setTheme('dark'),
      type: 'button',
    },
    'Set dark',
  )
}

beforeEach(() => {
  prefersDark = false
  mediaListeners.clear()
  localStorage.clear()
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.style.colorScheme = ''

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      addEventListener: (_type: string, listener: () => void) =>
        mediaListeners.add(listener),
      get matches() {
        return prefersDark
      },
      removeEventListener: (_type: string, listener: () => void) =>
        mediaListeners.delete(listener),
    }),
  })
})

describe('theme provider', () => {
  it('renders a ScriptOnce payload that resolves the stored theme before hydration', () => {
    localStorage.setItem('theme', 'system')
    prefersDark = true
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(
        createElement(
          ThemeProvider,
          null,
          createElement('span', null, 'Content'),
        ),
      )
    })

    const script = container.querySelector('[data-script-once]')
    expect(script?.textContent).toBe(getThemeScript('theme', 'system'))

    const classes = new Set(['stale-theme'])
    const style = { colorScheme: '' }
    runInNewContext(script?.textContent ?? '', {
      document: {
        documentElement: {
          classList: {
            add: (value: string) => classes.add(value),
            remove: (...values: string[]) => {
              for (const value of values) {
                classes.delete(value)
              }
            },
          },
          style,
        },
      },
      localStorage: { getItem: () => 'system' },
      matchMedia: () => ({ matches: true }),
    })

    expect(classes.has('dark')).toBe(true)
    expect(classes.has('light')).toBe(false)
    expect(style.colorScheme).toBe('dark')

    act(() => root.unmount())
  })

  it('persists explicit changes and applies their resolved class', () => {
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(ThemeProbe)))
    })

    const probe = container.querySelector('button')
    act(() => probe?.click())

    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(probe?.dataset.theme).toBe('dark')
    expect(probe?.dataset.resolvedTheme).toBe('dark')

    act(() => root.unmount())
  })

  it('tracks system-preference changes while the system theme is active', () => {
    localStorage.setItem('theme', 'system')
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(ThemeProbe)))
    })

    prefersDark = true
    act(() => {
      for (const listener of mediaListeners) {
        listener()
      }
    })

    const probe = container.querySelector('button')
    expect(probe?.dataset.theme).toBe('system')
    expect(probe?.dataset.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    act(() => root.unmount())
  })

  it('falls back to the default theme for an invalid stored value', () => {
    localStorage.setItem('theme', 'sepia')
    prefersDark = true
    const container = document.createElement('div')
    const root = createRoot(container)

    act(() => {
      root.render(createElement(ThemeProvider, null, createElement(ThemeProbe)))
    })

    const probe = container.querySelector('button')
    expect(probe?.dataset.theme).toBe('system')
    expect(probe?.dataset.resolvedTheme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    act(() => root.unmount())
  })
})
