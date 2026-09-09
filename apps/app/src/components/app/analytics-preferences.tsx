import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { clientEnv } from '@/env/client'
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
  setAnalyticsConsent,
} from '@/lib/analytics/client'

export function AnalyticsPreferences() {
  const [enabled, setEnabled] = useState(false)
  const [doNotTrack, setDoNotTrack] = useState(false)

  useEffect(() => {
    const syncConsent = () => {
      setEnabled(getAnalyticsConsent() === 'granted')
      setDoNotTrack(navigator.doNotTrack === '1')
    }
    syncConsent()
    window.addEventListener(ANALYTICS_CONSENT_EVENT, syncConsent)
    window.addEventListener('storage', syncConsent)
    return () => {
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, syncConsent)
      window.removeEventListener('storage', syncConsent)
    }
  }, [])

  if (!(clientEnv.VITE_GA_MEASUREMENT_ID || clientEnv.VITE_GTM_CONTAINER_ID)) {
    return null
  }

  return (
    <section
      aria-label="Analytics preferences"
      className="flex flex-col gap-3 rounded-lg border p-4"
    >
      <h2 className="font-semibold text-base">Optional analytics</h2>
      <p className="text-muted-foreground text-sm">
        Help us understand which pages lead to successful setup. We use no
        advertising cookies and send no account, image, or project data. This
        choice applies to this browser.
      </p>
      <p aria-live="polite" className="text-sm">
        {doNotTrack
          ? 'Analytics is off because Do Not Track is enabled in your browser.'
          : `Analytics is ${enabled ? 'on' : 'off'}.`}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          disabled={!enabled}
          onClick={() => setAnalyticsConsent('denied')}
          variant="outline"
        >
          Turn off analytics
        </Button>
        <Button
          className="min-h-11"
          disabled={enabled || doNotTrack}
          onClick={() => setAnalyticsConsent('granted')}
          variant="outline"
        >
          Allow analytics
        </Button>
      </div>
    </section>
  )
}
