import { clientEnv } from '@/env/client'

declare global {
  interface Window {
    dataLayer?: Array<IArguments | Record<string, unknown>>
  }
}

const ANALYTICS_CONSENT_KEY = 'keenpix.analytics-consent.v1'
const ANALYTICS_CONSENT_COOKIE = 'keenpix_analytics_consent'
const ANALYTICS_CONSENT_EVENT = 'keenpix:analytics-consent'

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

function pushGoogleCommand(...command: unknown[]) {
  window.dataLayer ??= []
  function gtag(..._command: unknown[]) {
    // biome-ignore lint/complexity/noArguments: gtag consumes its Arguments object.
    window.dataLayer?.push(arguments)
  }
  gtag(...command)
}

export function getAnalyticsConsent() {
  if (typeof window === 'undefined' || navigator.doNotTrack === '1') {
    return 'denied' as const
  }
  try {
    const consent = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
    if (consent === 'granted' || consent === 'denied') {
      return consent
    }
  } catch {
    // Fall through to the essential first-party consent cookie.
  }
  const consent = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ANALYTICS_CONSENT_COOKIE}=`))
    ?.slice(ANALYTICS_CONSENT_COOKIE.length + 1)
  return consent === 'granted' || consent === 'denied' ? consent : null
}

export function setAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent)
  } catch {
    // The essential first-party consent cookie remains as the fallback.
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  // biome-ignore lint/suspicious/noDocumentCookie: this essential cookie remembers the visitor's consent choice without loading analytics.
  document.cookie = `${ANALYTICS_CONSENT_COOKIE}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
  pushGoogleConsent('default', 'denied')
  pushGoogleConsent('update', consent)
  window.dataLayer ??= []
  window.dataLayer.push({
    event: 'consent_update',
    analytics_storage: consent,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  })

  if (consent === 'denied') {
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
    new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }),
  )

  if (consent === 'granted') {
    loadGoogleAnalytics()
  }
}

export function loadGoogleAnalytics() {
  if (clientEnv.VITE_GTM_CONTAINER_ID) {
    loadGoogleTagManager()
    return
  }
  const measurementId = clientEnv.VITE_GA_MEASUREMENT_ID
  if (
    !measurementId ||
    getAnalyticsConsent() !== 'granted' ||
    document.querySelector(`script[data-keenpix-ga="${measurementId}"]`)
  ) {
    return
  }

  pushGoogleConsent('default', 'denied')
  pushGoogleConsent('update', 'granted')
  const script = document.createElement('script')
  script.async = true
  script.dataset.keenpixGa = measurementId
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.append(script)
  pushGoogleCommand('js', new Date())
  pushGoogleCommand('config', measurementId)
  trackAcquisitionContext()
}

function loadGoogleTagManager() {
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
  if (clientEnv.VITE_GTM_CONTAINER_ID) {
    window.dataLayer.push({ event, ...parameters })
  } else if (clientEnv.VITE_GA_MEASUREMENT_ID) {
    pushGoogleCommand('event', event, parameters)
  }
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
