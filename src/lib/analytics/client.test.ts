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
  loadGoogleAnalytics,
  loadGoogleTagManager,
  setAnalyticsConsent,
  trackEvent,
} from './client'

describe('consent-aware Google analytics', () => {
  beforeEach(() => {
    clientEnv.VITE_GA_MEASUREMENT_ID = undefined
    clientEnv.VITE_GTM_CONTAINER_ID = undefined
    document.head.replaceChildren()
    window.localStorage.clear()
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

  it('prefers direct GA4 over GTM after consent', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'

    setAnalyticsConsent('granted')
    loadGoogleTagManager()

    const script = document.querySelector('script')
    expect(script?.dataset.keenpixGa).toBe('G-KEENPIX123')
    expect(script?.src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-KEENPIX123',
    )
    expect(document.querySelector('[data-keenpix-gtm]')).toBeNull()
    expect(
      window.dataLayer?.some(
        (entry) =>
          Reflect.get(entry, '0') === 'config' &&
          Reflect.get(entry, '1') === 'G-KEENPIX123',
      ),
    ).toBe(true)
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

  it('retains GTM as the fallback when direct GA4 is unset', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'

    setAnalyticsConsent('granted')

    const script = document.querySelector('script')
    expect(script?.dataset.keenpixGtm).toBe('GTM-KEENPIX123')
    expect(script?.src).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-KEENPIX123',
    )
  })
})
