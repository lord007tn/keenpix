import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { clientEnv } from '@/env/client'
import {
  getAnalyticsConsent,
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
  const providerAvailable = Boolean(
    clientEnv.VITE_GA_MEASUREMENT_ID || clientEnv.VITE_GTM_CONTAINER_ID,
  )
  const [available, setAvailable] = useState(providerAvailable)
  const [open, setOpen] = useState(false)
  const [choiceMade, setChoiceMade] = useState(false)

  useEffect(() => {
    if (!providerAvailable || navigator.doNotTrack === '1') {
      setAvailable(false)
      return
    }
    const consent = getAnalyticsConsent()
    setChoiceMade(consent !== null)
    setOpen(consent === null)
    if (consent === 'granted') {
      loadGoogleAnalytics()
      trackSocialSignup()
    }
  }, [providerAvailable])

  useEffect(() => {
    if (!providerAvailable) {
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
          cta_label: link.textContent?.trim().slice(0, 80),
          source_path: window.location.pathname,
        })
      }
    }
    document.addEventListener('click', onClick, { capture: true })
    return () =>
      document.removeEventListener('click', onClick, { capture: true })
  }, [providerAvailable])

  if (!available) {
    return null
  }

  if (!open) {
    return choiceMade ? (
      <Button
        className="fixed bottom-3 left-3 z-40 min-h-11 touch-manipulation bg-background/90 px-3 text-xs shadow-sm backdrop-blur"
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
      >
        Privacy choices
      </Button>
    ) : null
  }

  return (
    <aside
      aria-label="Analytics privacy choices"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-[calc(100vw-1.5rem)] flex-col gap-4 overflow-hidden rounded-lg border bg-background p-4 shadow-lg sm:max-w-2xl sm:flex-row sm:items-center"
    >
      <p className="min-w-0 flex-1 break-words text-muted-foreground text-sm leading-relaxed">
        Keenpix uses optional, consent-based analytics to understand which pages
        lead to signups and successful setup. We do not use advertising cookies
        or send account, image, or project data. See our{' '}
        <a
          className="rounded-sm text-foreground underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
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
            setChoiceMade(true)
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
            trackSocialSignup()
            setChoiceMade(true)
            setOpen(false)
          }}
        >
          Allow analytics
        </Button>
      </div>
    </aside>
  )
}
