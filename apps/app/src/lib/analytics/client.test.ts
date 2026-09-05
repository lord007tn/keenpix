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
  getAnalyticsPathname,
  getPublicContentGroup,
  loadGoogleAnalytics,
  setAnalyticsConsent,
  trackAcquisitionContext,
  trackComparisonCta,
  trackEvent,
  trackFunnelMilestone,
} from './client'

describe('consent-aware Google analytics', () => {
  beforeEach(() => {
    clientEnv.VITE_GA_MEASUREMENT_ID = undefined
    clientEnv.VITE_GTM_CONTAINER_ID = undefined
    document.head.replaceChildren()
    document.body.replaceChildren()
    window.history.replaceState({}, '', '/')
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

  it('removes sensitive route identifiers before analytics use', () => {
    expect(getAnalyticsPathname('/invite/private-token')).toBe('/invite/:token')
    expect(getAnalyticsPathname('/admin/customers/org_private')).toBe(
      '/admin/customers/:organization',
    )
    expect(getAnalyticsPathname('/compare/imgix-alternative')).toBe(
      '/compare/imgix-alternative',
    )
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

  it('uses Google event commands with a GTM-owned destination', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')

    trackEvent('project_created')

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        0: 'event',
        1: 'project_created',
        2: expect.objectContaining({ send_to: 'G-KEENPIX123' }),
      }),
    )
    expect(
      window.dataLayer?.some((entry) => Reflect.get(entry, '0') === 'config'),
    ).toBe(false)
    expect(document.querySelector('[data-keenpix-ga]')).toBeNull()
  })

  it('carries comparison context into later activation milestones without query data', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    window.history.replaceState({}, '', '/blog/best-image-cdns-2026')
    setAnalyticsConsent('granted')
    window.history.replaceState(
      {},
      '',
      '/compare/cloudinary-alternative?private=do-not-send',
    )

    trackComparisonCta(
      'cloudinary-alternative',
      '/signup?redirect=/private/project',
    )
    trackFunnelMilestone('project_created')

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        0: 'event',
        1: 'comparison_cta_click',
        2: expect.objectContaining({
          comparison_slug: 'cloudinary-alternative',
          cta_destination: '/signup',
          source_path: '/compare/cloudinary-alternative',
        }),
      }),
    )
    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        0: 'event',
        1: 'project_created',
        2: expect.objectContaining({
          activation_source_group: 'comparison',
          activation_source_path: '/compare/cloudinary-alternative',
          activation_comparison: 'cloudinary-alternative',
          activation_destination: '/signup',
        }),
      }),
    )
    expect(JSON.stringify(window.dataLayer)).not.toContain('private')
  })

  it('expires abandoned comparison context after 30 days', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')
    window.localStorage.setItem(
      'keenpix.activation-context.v1',
      JSON.stringify({
        activation_source_group: 'comparison',
        activation_comparison: 'imgix-alternative',
        recorded_at: Date.now() - 31 * 24 * 60 * 60 * 1000,
      }),
    )

    trackFunnelMilestone('project_created')

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({ 0: 'event', 1: 'project_created' }),
    )
    expect(
      window.localStorage.getItem('keenpix.activation-context.v1'),
    ).toBeNull()
  })

  it('clears comparison context on withdrawal and stops future sends', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')
    window.history.replaceState({}, '', '/compare/imgix-alternative')
    trackComparisonCta('imgix-alternative', '/signup')

    setAnalyticsConsent('denied')
    const count = window.dataLayer?.length
    trackFunnelMilestone('project_created')
    expect(window.dataLayer).toHaveLength(count ?? 0)
    expect(
      window.localStorage.getItem('keenpix.activation-context.v1'),
    ).toBeNull()
  })

  it('preserves consented source across a login round trip and reload', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    window.history.replaceState(
      {},
      '',
      '/compare/imgix-alternative?utm_source=github&utm_medium=referral&utm_campaign=private@example.test',
    )
    setAnalyticsConsent('granted')
    trackAcquisitionContext()
    trackComparisonCta('imgix-alternative', '/signup')
    const original = window.localStorage.getItem(
      'keenpix.activation-context.v1',
    )

    for (const path of [
      '/login',
      '/app/dashboard?new_user=google',
      '/pricing',
    ]) {
      window.history.replaceState({}, '', path)
      document.head.replaceChildren()
      loadGoogleAnalytics()
      trackAcquisitionContext()
    }
    expect(window.localStorage.getItem('keenpix.activation-context.v1')).toBe(
      original,
    )
    trackFunnelMilestone('project_created')
    trackFunnelMilestone('project_created')
    const events = window.dataLayer?.filter(
      (entry) => Reflect.get(entry, '1') === 'project_created',
    )
    expect(events).toHaveLength(1)
    expect(events?.[0] && Reflect.get(events[0], '2')).toMatchObject({
      activation_source_path: '/compare/imgix-alternative',
      activation_utm_source: 'github',
      activation_utm_medium: 'referral',
    })
    expect(JSON.stringify(window.dataLayer)).not.toContain(
      'private@example.test',
    )
  })

  it('does not claim a product or Google return is a new acquisition landing', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    window.history.replaceState({}, '', '/app/dashboard?new_user=google')
    setAnalyticsConsent('granted')
    trackAcquisitionContext()
    expect(
      window.localStorage.getItem('keenpix.funnel.acquisition_landing.v1'),
    ).toBeNull()
    expect(
      window.localStorage.getItem('keenpix.activation-context.v1'),
    ).toBeNull()
  })

  it('labels operator and impersonated activity without consuming customer milestones', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')
    const shell = document.createElement('main')
    shell.dataset.analyticsTraffic = 'internal'
    document.body.append(shell)
    trackFunnelMilestone('project_created')
    shell.remove()
    trackFunnelMilestone('project_created')
    const events = window.dataLayer?.filter(
      (entry) => Reflect.get(entry, '1') === 'project_created',
    )
    expect(events).toHaveLength(2)
    expect(events?.[0] && Reflect.get(events[0], '2')).toMatchObject({
      traffic_type: 'internal',
    })
    expect(events?.[1] && Reflect.get(events[1], '2')).toMatchObject({
      traffic_type: undefined,
    })
  })

  it('disables GTM-owned destinations before consent commands and re-enables on grant', () => {
    clientEnv.VITE_GTM_CONTAINER_ID = 'GTM-KEENPIX123'
    setAnalyticsConsent('granted')
    for (const src of [
      'https://www.googletagmanager.com/gtag/js?id=G-DESTINATION',
      'https://www.googletagmanager.com/gtag/destination?id=G-SECOND',
      'https://example.test/gtag/js?id=G-UNTRUSTED',
    ]) {
      const script = document.createElement('script')
      script.src = src
      document.head.append(script)
    }
    const states: unknown[] = []
    window.dataLayer ??= []
    const push = vi.spyOn(window.dataLayer, 'push').mockImplementation(() => {
      states.push(Reflect.get(window, 'ga-disable-G-DESTINATION'))
      return 0
    })
    setAnalyticsConsent('denied')
    expect(states.length).toBeGreaterThan(0)
    expect(states.every((state) => state === true)).toBe(true)
    expect(Reflect.get(window, 'ga-disable-G-SECOND')).toBe(true)
    expect(Reflect.get(window, 'ga-disable-G-UNTRUSTED')).toBeUndefined()
    push.mockRestore()
    setAnalyticsConsent('granted')
    expect(Reflect.get(window, 'ga-disable-G-DESTINATION')).toBe(false)
    expect(Reflect.get(window, 'ga-disable-G-SECOND')).toBe(false)
    expect(document.querySelectorAll('[data-keenpix-gtm]')).toHaveLength(1)
  })

  it('never grants Google consent when Do Not Track is enabled', () => {
    clientEnv.VITE_GA_MEASUREMENT_ID = 'G-KEENPIX123'
    Object.defineProperty(window.navigator, 'doNotTrack', {
      configurable: true,
      value: '1',
    })
    setAnalyticsConsent('granted')
    trackFunnelMilestone('project_created')
    expect(getAnalyticsConsent()).toBe('denied')
    expect(document.querySelector('script')).toBeNull()
    expect(JSON.stringify(window.dataLayer)).not.toContain('granted')
    expect(Reflect.get(window, 'ga-disable-G-KEENPIX123')).toBe(true)
  })

  it('does not consume a milestone when no provider is configured', () => {
    setAnalyticsConsent('granted')
    trackFunnelMilestone('project_created')
    expect(
      window.localStorage.getItem('keenpix.funnel.project_created.v1'),
    ).toBeNull()
  })
})
