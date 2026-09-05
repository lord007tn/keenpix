// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { location, clientEnv } = vi.hoisted(() => ({
  location: { pathname: '/' },
  clientEnv: {
    VITE_GA_MEASUREMENT_ID: 'G-LOCALTEST',
    VITE_GTM_CONTAINER_ID: undefined as string | undefined,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useRouterState: () => location.pathname,
}))
vi.mock('@/env/client', () => ({ clientEnv }))

import { setAnalyticsConsent } from '@/lib/analytics/client'
import { AnalyticsConsent } from './analytics-consent'

const container = document.createElement('div')
let root = createRoot(container)

function pageViews() {
  return window.dataLayer?.filter(
    (entry) => Reflect.get(entry, '1') === 'page_view',
  )
}

async function navigate(path: string) {
  window.history.pushState({}, '', path)
  location.pathname = window.location.pathname
  await act(() => root.render(createElement(AnalyticsConsent)))
}

describe('analytics navigation lifecycle', () => {
  beforeEach(() => {
    Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
    document.head.replaceChildren()
    document.body.append(container)
    window.localStorage.clear()
    // biome-ignore lint/suspicious/noDocumentCookie: isolate the essential consent cookie.
    document.cookie = 'keenpix_analytics_consent=; Max-Age=0; Path=/'
    window.dataLayer = []
    clientEnv.VITE_GTM_CONTAINER_ID = undefined
  })

  afterEach(async () => {
    await act(() => root.unmount())
    root = createRoot(container)
    vi.restoreAllMocks()
  })

  it('owns one initial view and one per SPA pathname, excluding URL secrets', async () => {
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
    await navigate('/pricing?private=secret#token')
    expect(pageViews()).toHaveLength(1)
    await navigate('/signup?redirect=/invite/secret')
    expect(pageViews()).toHaveLength(2)
    await navigate('/signup?redirect=/app')
    expect(pageViews()).toHaveLength(2)
    expect(JSON.stringify(window.dataLayer)).not.toContain('secret')
    const config = window.dataLayer?.find(
      (entry) => Reflect.get(entry, '0') === 'config',
    )
    expect(config && Reflect.get(config, '2')).toMatchObject({
      send_page_view: false,
    })
  })

  it('does not replay denied navigation and handles withdrawal and regrant', async () => {
    await navigate('/')
    await navigate('/pricing')
    expect(pageViews()).toHaveLength(0)
    await act(() => setAnalyticsConsent('granted'))
    expect(pageViews()).toHaveLength(1)
    await act(() => setAnalyticsConsent('denied'))
    await navigate('/signup')
    expect(pageViews()).toHaveLength(1)
    await act(() => setAnalyticsConsent('granted'))
    expect(pageViews()).toHaveLength(2)
    await navigate('/pricing')
    expect(pageViews()).toHaveLength(3)
  })

  it('emits an explicit initial GTM page view after consent initialization', async () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-LOCALTEST'
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
    await navigate('/compare/imgix-alternative')
    expect(
      window.dataLayer?.filter(
        (entry) => Reflect.get(entry, '1') === 'page_view',
      ),
    ).toHaveLength(1)
  })

  it('honors withdrawal from another tab and disables the loaded Google collector', async () => {
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
    await navigate('/pricing')
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'denied')
    await act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'keenpix.analytics-consent.v1',
          newValue: 'denied',
        }),
      ),
    )
    await navigate('/signup')
    expect(pageViews()).toHaveLength(1)
    expect(Reflect.get(window, 'ga-disable-G-LOCALTEST')).toBe(true)
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'consent_update',
        analytics_storage: 'denied',
      }),
    )
  })

  it('lets a visitor withdraw consent from the privacy page', async () => {
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
    await navigate('/legal/privacy')
    const preferences = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Analytics preferences',
    )
    expect(preferences).toBeDefined()
    await act(() => preferences?.click())
    const decline = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Decline',
    )
    expect(decline).toBeDefined()
    await act(() => decline?.click())
    expect(window.localStorage.getItem('keenpix.analytics-consent.v1')).toBe(
      'denied',
    )
    await navigate('/pricing')
    expect(pageViews()).toHaveLength(1)
  })

  it('deduplicates the Google callback hint on reload without sending its query', async () => {
    window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
    await navigate('/app/dashboard?new_user=google&token=private-token')
    expect(window.location.search).not.toContain('new_user')
    await act(() => root.unmount())
    root = createRoot(container)
    await navigate('/app/dashboard?new_user=google')
    expect(
      window.dataLayer?.filter(
        (entry) => Reflect.get(entry, '1') === 'sign_up',
      ),
    ).toHaveLength(1)
    expect(JSON.stringify(window.dataLayer)).not.toContain('private-token')
  })
})
