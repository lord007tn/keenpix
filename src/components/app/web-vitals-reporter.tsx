import { useEffect } from 'react'
import type { Metric } from 'web-vitals'
import {
  ANALYTICS_CONSENT_EVENT,
  getAnalyticsConsent,
} from '@/lib/analytics/client'

const SAMPLE_RATE = 0.1

export function WebVitalsReporter() {
  useEffect(() => {
    if (!import.meta.env.PROD || navigator.doNotTrack === '1') {
      return
    }

    let cancelled = false
    let enabled = getAnalyticsConsent() === 'granted'
    let started = false
    let sampled: boolean | null = null
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined

    const collect = async () => {
      const { onCLS, onINP, onLCP } = await import('web-vitals')
      if (cancelled) {
        return
      }

      const report = (metric: Metric) => {
        if (!enabled || getAnalyticsConsent() !== 'granted') {
          return
        }
        const width = window.innerWidth
        let deviceClass = 'desktop'
        if (width < 640) {
          deviceClass = 'phone'
        } else if (width < 1024) {
          deviceClass = 'tablet'
        }
        const payload = {
          version: 1,
          name: metric.name,
          value: metric.value,
          delta: metric.delta,
          rating: metric.rating,
          id: metric.id,
          navigationType: metric.navigationType,
          route: window.location.pathname,
          deviceClass,
          viewport: { width, height: window.innerHeight },
        }

        fetch('/api/web-vitals', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'omit',
          keepalive: true,
        }).catch(() => undefined)
      }

      onCLS(report)
      onINP(report)
      onLCP(report)
    }

    const start = () => {
      if (started) {
        enabled = true
        return
      }
      sampled ??= Math.random() < SAMPLE_RATE
      if (!sampled) {
        return
      }
      started = true
      enabled = true
      timeoutId = globalThis.setTimeout(collect, 1000)
    }

    const onConsent = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }
      enabled = event.detail === 'granted'
      if (enabled) {
        start()
      }
    }

    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent)
    if (enabled) {
      start()
    }
    return () => {
      cancelled = true
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId)
      }
      window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent)
    }
  }, [])

  return null
}
