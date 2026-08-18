import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { clientEnv } from '@/env/client'
import {
  getAnalyticsConsent,
  getPublicContentGroup,
  loadGoogleAnalytics,
  setAnalyticsConsent,
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
  const location = useLocation()
  const previousPath = useRef(location.pathname)
  const providerAvailable = Boolean(
    clientEnv.VITE_GA_MEASUREMENT_ID || clientEnv.VITE_GTM_CONTAINER_ID,
  )
  const [available, setAvailable] = useState(providerAvailable)
  const [open, setOpen] = useState(false)
  const [trackingEnabled, setTrackingEnabled] = useState(false)

  useEffect(() => {
    if (!providerAvailable || navigator.doNotTrack === '1') {
      setAvailable(false)
      return
    }
    const consent = getAnalyticsConsent()
    setOpen(consent === null)
    setTrackingEnabled(consent === 'granted')
    if (consent === 'granted') {
      loadGoogleAnalytics()
      trackSocialSignup()
    }
  }, [providerAvailable])

  useEffect(() => {
    if (!trackingEnabled) {
      return
    }
    if (previousPath.current === location.pathname) {
      return
    }
    previousPath.current = location.pathname
    let pagePath = location.pathname
    if (pagePath.startsWith('/invite/')) {
      pagePath = '/invite/:token'
    } else if (pagePath.startsWith('/admin/customers/')) {
      pagePath = '/admin/customers/:organization'
    }
    trackEvent('page_view', {
      content_group: getPublicContentGroup(pagePath),
      page_location: `${window.location.origin}${pagePath}`,
      page_path: pagePath,
      page_title: document.title,
    })
  }, [location.pathname, trackingEnabled])

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
      if (url.origin === window.location.origin && url.pathname === '/signup') {
        trackEvent('primary_cta_click', {
          content_group: getPublicContentGroup(window.location.pathname),
          cta_label: link.textContent?.trim().slice(0, 80),
          source_path: window.location.pathname,
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
    return null
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
            setTrackingEnabled(false)
            setOpen(false)
          }}
          variant="outline"
        >
          Decline
        </Button>
        <Button
          className="min-h-11 flex-1 touch-manipulation sm:flex-none"
          onClick={() => {
            setAnalyticsConsent('granted')
            setTrackingEnabled(true)
            trackSocialSignup()
            setOpen(false)
          }}
        >
          Allow analytics
        </Button>
      </div>
    </aside>
  )
}
