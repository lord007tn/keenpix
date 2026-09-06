import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)

  useEffect(() => {
    if (!providerAvailable || navigator.doNotTrack === '1') {
      setAvailable(false)
      return
    }
    const syncConsent = () => {
      const consent = getAnalyticsConsent()
      setAvailable(true)
      setOpen(consent === null)
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

  if (!available) {
    return null
  }

  if (!open) {
    return pathname === '/legal/privacy' ? (
      <Button
        className="fixed right-3 bottom-20 z-50 min-h-11 sm:right-5"
        onClick={() => setOpen(true)}
        variant="outline"
      >
        Analytics preferences
      </Button>
    ) : null
  }

  return (
    <aside
      aria-label="Analytics privacy choices"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[min(24rem,calc(100svh-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col gap-2 overflow-y-auto overscroll-contain rounded-lg border bg-background p-3 shadow-lg sm:max-w-2xl sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 break-words text-muted-foreground text-xs leading-relaxed sm:text-sm">
        Optional analytics helps us understand which pages lead to successful
        setup. We use no advertising cookies and send no account, image, or
        project data. See our{' '}
        <a
          className="inline-flex min-h-11 items-center rounded-sm text-foreground underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          href="/legal/privacy"
        >
          privacy policy
        </a>
        .
      </p>
      <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
        <Button
          className="min-h-11 flex-1 touch-manipulation sm:flex-none"
          onClick={() => {
            setAnalyticsConsent('denied')
          }}
          variant="outline"
        >
          Decline
        </Button>
        <Button
          className="min-h-11 flex-1 touch-manipulation sm:flex-none"
          onClick={() => {
            setAnalyticsConsent('granted')
          }}
        >
          Allow analytics
        </Button>
      </div>
    </aside>
  )
}
