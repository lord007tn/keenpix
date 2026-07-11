import { clientEnv } from '@/env/client'

declare global {
  interface Window {
    dataLayer?: Array<IArguments | Record<string, unknown>>
  }
}

const ANALYTICS_CONSENT_KEY = 'keenpix.analytics-consent.v1'
export const ANALYTICS_CONSENT_EVENT = 'keenpix:analytics-consent'

export type AnalyticsConsent = 'granted' | 'denied'

function pushGoogleConsent(
  command: 'default' | 'update',
  consent: AnalyticsConsent,
) {
  window.dataLayer ??= []
  function gtag(
    _name: 'consent',
    _command: 'default' | 'update',
    _settings: Record<string, AnalyticsConsent>,
  ) {
    // biome-ignore lint/complexity/noArguments: Consent Mode consumes gtag's Arguments object.
    window.dataLayer?.push(arguments)
  }
  gtag('consent', command, {
    analytics_storage: consent,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })
}

export function getAnalyticsConsent() {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1') {
    return 'denied' as const
  }
  try {
    const consent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return consent === 'granted' || consent === 'denied' ? consent : null
  } catch {
    return 'denied' as const
  }
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  let effectiveConsent = consent
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent)
  } catch {
    effectiveConsent = 'denied'
  }
  pushGoogleConsent('default', 'denied')
  pushGoogleConsent('update', effectiveConsent)
  window.dataLayer ??= []
  window.dataLayer.push({
    event: 'consent_update',
    analytics_storage: effectiveConsent,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })

  if (effectiveConsent === 'denied') {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0]?.trim()
      if (name?.startsWith('_ga')) {
        // biome-ignore lint/suspicious/noDocumentCookie: consent revocation must remove legacy GA cookies in browsers without Cookie Store.
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
        if (window.location.hostname.endsWith('keenpix.com')) {
          // biome-ignore lint/suspicious/noDocumentCookie: also remove cookies scoped to the apex domain.
          document.cookie = `${name}=; Max-Age=0; Path=/; Domain=.keenpix.com; SameSite=Lax`
        }
      }
    }
  }
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: effectiveConsent }),
  )

  if (effectiveConsent === 'granted') {
    loadGoogleTagManager()
  }
}

export function loadGoogleTagManager() {
  const containerId = clientEnv.VITE_GTM_CONTAINER_ID
  if (
    !containerId ||
    getAnalyticsConsent() !== 'granted' ||
    document.querySelector(`script[data-keenpix-gtm="${containerId}"]`)
  ) {
    return
  }

  window.dataLayer ??= []
  pushGoogleConsent('default', 'denied')
  pushGoogleConsent('update', 'granted')
  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  })
  const script = document.createElement('script')
  script.async = true
  script.dataset.keenpixGtm = containerId
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  document.head.append(script)
  trackAcquisitionContext()
}

function trackAcquisitionContext() {
  if (getAnalyticsConsent() !== 'granted') {
    return
  }
  const search = new URLSearchParams(window.location.search)
  let referrerOrigin = 'direct'
  if (document.referrer) {
    try {
      referrerOrigin = new URL(document.referrer).origin
    } catch {
      referrerOrigin = 'unknown'
    }
  }
  trackFunnelMilestone('acquisition_landing', {
    landing_path: window.location.pathname,
    referrer_origin: referrerOrigin,
    utm_source: search.get('utm_source')?.slice(0, 100),
    utm_medium: search.get('utm_medium')?.slice(0, 100),
    utm_campaign: search.get('utm_campaign')?.slice(0, 100),
  })
}

export function trackEvent(
  event: string,
  parameters: Record<string, boolean | number | string | undefined> = {},
) {
  if (getAnalyticsConsent() !== 'granted') {
    return
  }
  window.dataLayer ??= []
  window.dataLayer.push({ event, ...parameters })
}

export function trackFunnelMilestone(
  event: string,
  parameters: Record<string, boolean | number | string | undefined> = {},
) {
  if (getAnalyticsConsent() !== 'granted') {
    return
  }
  const key = `keenpix.funnel.${event}.v1`
  try {
    if (window.localStorage.getItem(key)) {
      return
    }
    window.localStorage.setItem(key, '1')
  } catch {
    return
  }
  trackEvent(event, parameters)
}
