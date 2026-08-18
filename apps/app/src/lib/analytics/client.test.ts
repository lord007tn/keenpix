// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clientEnv } = vi.hoisted(() => ({
  clientEnv: {
    VITE_GA_MEASUREMENT_ID: undefined as string | undefined,
    VITE_GTM_CONTAINER_ID: undefined as string | undefined,
  },
}))

vi.mock('@/env/client', () => ({ clientEnv }))

import {
  getAnalyticsConsent,
  getPublicContentGroup,
  loadGoogleAnalytics,
  setAnalyticsConsent,
  trackEvent,
} from './client'

describe('consent-aware Google analytics', () => {
  beforeEach(() => {
    clientEnv.VITE_GA_MEASUREMENT_ID = undefined
    clientEnv.VITE_GTM_CONTAINER_ID = undefined
    document.head.replaceChildren()
    window.localStorage.clear()
    // biome-ignore lint/suspicious/noDocumentCookie: reset the essential consent cookie between isolated browser tests.
    document.cookie = 'keenpix_analytics_consent=; Max-Age=0; Path=/'
    window.dataLayer = []
    Object.defineProperty(window.navigator, 'doNotTrack', {
      configurable: true,
      value: '0',
    })
  })

  it('does not load or send analytics before consent', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'

    loadGoogleAnalytics()
    trackEvent('sign_up', { method: 'email' })

    expect(document.querySelector('script')).toBeNull()
    expect(window.dataLayer).toEqual([])
  })

  it('groups organic landing surfaces for funnel reporting', () => {
    expect(getPublicContentGroup('/blog/best-image-cdns-2026')).toBe(
      'editorial',
    )
    expect(getPublicContentGroup('/compare/gumlet-alternative')).toBe(
      'comparison',
    )
    expect(getPublicContentGroup('/docs/frameworks/nextjs')).toBe(
      'documentation',
    )
    expect(getPublicContentGroup('/pricing')).toBe('pricing')
  })

  it('remembers a consent decision when local storage is unavailable later', () => {
    setAnalyticsConsent('denied')
    window.localStorage.clear()

    expect(getAnalyticsConsent()).toBe('denied')
  })

  it('prefers GTM over direct GA4 after consent', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'

    setAnalyticsConsent('granted')
    loadGoogleAnalytics()

    const script = document.querySelector('script')
    expect(script?.dataset.keenpixGtm).toBe('GTM-KEENPIX123')
    expect(script?.src).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-KEENPIX123',
    )
    expect(document.querySelector('[data-keenpix-ga]')).toBeNull()
  })

  it('sends direct GA4 events through gtag commands', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    setAnalyticsConsent('granted')

    trackEvent('begin_checkout', { plan: 'basic' })

    expect(
      window.dataLayer?.some((entry) => {
        const parameters = Reflect.get(entry, '2')
        return (
          Reflect.get(entry, '0') === 'event' &&
          Reflect.get(entry, '1') === 'begin_checkout' &&
          typeof parameters === 'object' &&
          parameters !== null &&
          Reflect.get(parameters, 'plan') === 'basic'
        )
      }),
    ).toBe(true)
  })

  it('loads GTM when direct GA4 is unset', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'

    setAnalyticsConsent('granted')

    const script = document.querySelector('script')
    expect(script?.dataset.keenpixGtm).toBe('GTM-KEENPIX123')
    expect(script?.src).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-KEENPIX123',
    )
  })

  it('pushes custom events for GTM to route to GA4', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')

    trackEvent('project_created')

    expect(window.dataLayer).toContainEqual({ event: 'project_created' })
  })
})
