import { clientEnv } from '@/env/client'

declare global {
  interface Window {
    dataLayer?: Array<IArguments | Record<string, unknown>>
  }
}

const ANALYTICS_CONSENT_KEY = 'keenpix.analytics-consent.v1'
const ANALYTICS_CONSENT_COOKIE = 'keenpix_analytics_consent'
const ANALYTICS_CONSENT_EVENT = 'keenpix:analytics-consent'
const ACTIVATION_CONTEXT_KEY = 'keenpix.activation-context.v1'
const ACTIVATION_CONTEXT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const SAFE_COMPARISON_SLUG = /[^a-z0-9-]/g

export type AnalyticsConsent = 'granted' | 'denied'

export function getPublicContentGroup(pathname: string) {
  if (pathname === '/') {
    return 'home'
  }
  if (pathname === '/pricing') {
    return 'pricing'
  }
  if (pathname === '/self-hosted-image-cdn') {
    return 'self_hosted'
  }
  if (pathname.startsWith('/compare')) {
    return 'comparison'
  }
  if (pathname.startsWith('/blog')) {
    return 'editorial'
  }
  if (pathname.startsWith('/docs')) {
    return 'documentation'
  }
  if (pathname === '/about' || pathname === '/security') {
    return 'trust'
  }
  if (pathname.startsWith('/legal')) {
    return 'legal'
  }
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  ) {
    return 'authentication'
  }
  if (pathname.startsWith('/app')) {
    return 'product'
  }
  return 'other'
}

export function getAnalyticsPathname(pathname: string) {
  if (pathname.startsWith('/invite/')) {
    return '/invite/:token'
  }
  if (pathname.startsWith('/admin/customers/')) {
    return '/admin/customers/:organization'
  }
  return pathname
}

function getActivationContext() {
  try {
    const stored = window.localStorage.getItem(ACTIVATION_CONTEXT_KEY)
    if (!stored) {
      return {}
    }
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) {
      return {}
    }
    const recordedAt = Reflect.get(parsed, 'recorded_at')
    if (
      typeof recordedAt !== 'number' ||
      !Number.isFinite(recordedAt) ||
      Date.now() - recordedAt > ACTIVATION_CONTEXT_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(ACTIVATION_CONTEXT_KEY)
      return {}
    }
    const context: Record<string, string> = {}
    for (const key of [
      'activation_source_group',
      'activation_source_path',
      'activation_comparison',
      'activation_destination',
    ]) {
      const value = Reflect.get(parsed, key)
      if (typeof value === 'string') {
        context[key] = value.slice(0, 120)
      }
    }
    return context
  } catch {
    return {}
  }
}

function rememberActivationContext(context: Record<string, string>) {
  if (getAnalyticsConsent() !== 'granted') {
    return
  }
  try {
    window.localStorage.setItem(
      ACTIVATION_CONTEXT_KEY,
      JSON.stringify({
        ...getActivationContext(),
        ...context,
        recorded_at: Date.now(),
      }),
    )
  } catch {
    // Funnel events still work without durable attribution context.
  }
}

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
    try {
      window.localStorage.removeItem(ACTIVATION_CONTEXT_KEY)
    } catch {
      // Storage may be unavailable; analytics remains disabled regardless.
    }
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
  const landingPath = getAnalyticsPathname(window.location.pathname)
  const contentGroup = getPublicContentGroup(landingPath)
  if (contentGroup !== 'authentication' && contentGroup !== 'product') {
    rememberActivationContext({
      activation_source_group: contentGroup,
      activation_source_path: landingPath,
    })
  }
  trackFunnelMilestone('acquisition_landing', {
    content_group: contentGroup,
    landing_path: landingPath,
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

export function trackComparisonCta(
  comparisonSlug: string,
  destination: string,
) {
  if (getAnalyticsConsent() !== 'granted') {
    return
  }
  const comparison = comparisonSlug
    .toLowerCase()
    .replace(SAFE_COMPARISON_SLUG, '')
    .slice(0, 100)
  const destinationPath = getAnalyticsPathname(
    new URL(destination, window.location.origin).pathname,
  )
  const sourcePath = getAnalyticsPathname(window.location.pathname)
  rememberActivationContext({
    activation_source_group: 'comparison',
    activation_source_path: sourcePath,
    activation_comparison: comparison,
    activation_destination: destinationPath,
  })
  trackEvent('comparison_cta_click', {
    comparison_slug: comparison,
    cta_destination: destinationPath,
    source_path: sourcePath,
  })
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
  trackEvent(event, { ...getActivationContext(), ...parameters })
  if (event === 'first_image_served') {
    try {
      window.localStorage.removeItem(ACTIVATION_CONTEXT_KEY)
    } catch {
      // The milestone has already been emitted; storage cleanup is best-effort.
    }
  }
}
