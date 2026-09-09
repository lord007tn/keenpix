import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { clientEnv } from '@/env/client'
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  getAnalyticsPathname,
  getPublicContentGroup,
  loadGoogleAnalytics,
  setAnalyticsConsent,
  trackAcquisitionContext,
  trackComparisonCta,
  trackEvent,
  trackFunnelMilestone,
} from '@/lib/analytics/client'

function trackSocialSignup() {
  const url = new URL(window.location.href)
  const method = url.searchParams.get('new_user')
  if (method !== 'google') {
    return
  }
  trackFunnelMilestone('sign_up', { method })
  url.searchParams.delete('new_user')
  window.history.replaceState(window.history.state, '', url)
}

export function AnalyticsConsent() {
  const pathname = useRouterState({
    // Requested locations can precede history/DOM commit. Measure settled views.
    select: (state) => state.resolvedLocation?.pathname,
  })
  const previousPath = useRef<string | null>(null)
  const providerAvailable = Boolean(
    clientEnv.VITE_GA_MEASUREMENT_ID || clientEnv.VITE_GTM_CONTAINER_ID,
  )
  const [trackingEnabled, setTrackingEnabled] = useState(false)

  useEffect(() => {
    if (!providerAvailable || navigator.doNotTrack === '1') {
      return
    }
    const syncConsent = () => {
      const consent = getAnalyticsConsent()
      setTrackingEnabled(consent === 'granted')
      if (consent === 'granted') {
        loadGoogleAnalytics()
      } else {
        previousPath.current = null
      }
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'keenpix.analytics-consent.v1' || event.key === null) {
        setAnalyticsConsent(getAnalyticsConsent() ?? 'denied')
      }
    }
    syncConsent()
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncConsent)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncConsent)
      window.removeEventListener('storage', onStorage)
    }
  }, [providerAvailable])

  useEffect(() => {
    if (!(trackingEnabled && pathname)) {
      return
    }
    if (previousPath.current === pathname) {
      return
    }
    trackEvent('page_view', {
      ...(previousPath.current
        ? {
            page_referrer: `${window.location.origin}${getAnalyticsPathname(previousPath.current)}`,
          }
        : {}),
    })
    previousPath.current = pathname
    trackAcquisitionContext()
    trackSocialSignup()
  }, [pathname, trackingEnabled])

  useEffect(() => {
    if (!(providerAvailable && trackingEnabled)) {
      return
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      const link = target.closest('a[href]')
      if (!(link instanceof HTMLAnchorElement)) {
        return
      }
      const url = new URL(link.href, window.location.origin)
      const comparisonSlug = link.dataset.analyticsComparisonCta
      if (comparisonSlug && url.origin === window.location.origin) {
        trackComparisonCta(comparisonSlug, url.pathname)
      }
      if (url.origin === window.location.origin && url.pathname === '/signup') {
        const sourcePath = getAnalyticsPathname(window.location.pathname)
        trackEvent('primary_cta_click', {
          content_group: getPublicContentGroup(sourcePath),
          cta_label: link.textContent?.trim().slice(0, 80),
          source_path: sourcePath,
        })
      }
    }
    document.addEventListener('click', onClick, { capture: true })
    return () =>
      document.removeEventListener('click', onClick, { capture: true })
  }, [providerAvailable, trackingEnabled])

  return null
}
