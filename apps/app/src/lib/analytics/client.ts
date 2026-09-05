import dayjs from 'dayjs'
import { clientEnv } from '@/env/client'

declare global {
  interface Window {
    dataLayer?: Array<IArguments | Record<string, unknown>>
  }
}

const ANALYTICS_CONSENT_KEY = 'keenpix.analytics-consent.v1'
const ANALYTICS_CONSENT_COOKIE = 'keenpix_analytics_consent'
export const ANALYTICS_CONSENT_EVENT = 'keenpix:analytics-consent'
const ACTIVATION_CONTEXT_KEY = 'keenpix.activation-context.v1'
const SAFE_COMPARISON_SLUG = /[^a-z0-9-]/g
const PUBLIC_SOURCES = [
  'google',
  'bing',
  'duckduckgo',
  'github',
  'x',
  'twitter',
  'linkedin',
  'reddit',
  'producthunt',
  'newsletter',
]
const PUBLIC_MEDIA = [
  'organic',
  'referral',
  'social',
  'email',
  'cpc',
  'paid_social',
]

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
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return 'internal'
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
      dayjs(recordedAt).isAfter(dayjs()) ||
      dayjs(recordedAt).isBefore(dayjs().subtract(30, 'day'))
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
      'activation_utm_source',
      'activation_utm_medium',
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
        recorded_at: dayjs().valueOf(),
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

export function setAnalyticsConsent(requestedConsent: AnalyticsConsent) {
  const consent = navigator.doNotTrack === '1' ? 'denied' : requestedConsent
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
  if (clientEnv.VITE_GA_MEASUREMENT_ID) {
    Reflect.set(
      window,
      `ga-disable-${clientEnv.VITE_GA_MEASUREMENT_ID}`,
      consent !== 'granted',
    )
  }
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
  if (consent === 'granted') {
    loadGoogleAnalytics()
  }
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent }),
  )
}

function getPageContext() {
  const pagePath = getAnalyticsPathname(window.location.pathname)
  const contentGroup = getPublicContentGroup(pagePath)
  const search = new URLSearchParams(window.location.search)
  let referrer = ''
  try {
    if (document.referrer) {
      referrer = new URL(document.referrer).origin
    }
  } catch {
    // An invalid referrer carries no usable acquisition evidence.
  }
  return {
    content_group: contentGroup,
    campaign_source: PUBLIC_SOURCES.find(
      (source) => source === search.get('utm_source'),
    ),
    campaign_medium: PUBLIC_MEDIA.find(
      (medium) => medium === search.get('utm_medium'),
    ),
    page_location: `${window.location.origin}${pagePath}`,
    page_path: pagePath,
    page_referrer: referrer,
    page_title: ['authentication', 'product', 'internal', 'other'].includes(
      contentGroup,
    )
      ? 'Keenpix'
      : document.title,
    traffic_type:
      document.querySelector('[data-analytics-traffic="internal"]') ||
      contentGroup === 'internal'
        ? 'internal'
        : undefined,
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
  pushGoogleCommand('set', getPageContext())
  const script = document.createElement('script')
  script.async = true
  script.dataset.keenpixGa = measurementId
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.append(script)
  pushGoogleCommand('js', dayjs().toDate())
  pushGoogleCommand('config', measurementId, {
    ...getPageContext(),
    send_page_view: false,
  })
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
  pushGoogleCommand('set', getPageContext())
  window.dataLayer.push({
    'gtm.start': Date.now(),
    event: 'gtm.js',
  })
  const script = document.createElement('script')
  script.async = true
  script.dataset.keenpixGtm = containerId
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  document.head.append(script)
}

export function trackAcquisitionContext() {
  if (
    getAnalyticsConsent() !== 'granted' ||
    !(clientEnv.VITE_GTM_CONTAINER_ID || clientEnv.VITE_GA_MEASUREMENT_ID) ||
    getPageContext().traffic_type === 'internal'
  ) {
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
  if (
    ['authentication', 'product', 'internal', 'other'].includes(contentGroup)
  ) {
    return
  }
  if (!getActivationContext().activation_source_path) {
    const source = PUBLIC_SOURCES.find(
      (value) => value === search.get('utm_source'),
    )
    const medium = PUBLIC_MEDIA.find(
      (value) => value === search.get('utm_medium'),
    )
    rememberActivationContext({
      activation_source_group: contentGroup,
      activation_source_path: landingPath,
      ...(source ? { activation_utm_source: source } : {}),
      ...(medium ? { activation_utm_medium: medium } : {}),
    })
  }
  trackFunnelMilestone('acquisition_landing', {
    content_group: contentGroup,
    landing_path: landingPath,
    referrer_origin: referrerOrigin,
    // Only public channel labels are accepted; arbitrary campaign text can be PII.
    utm_source: PUBLIC_SOURCES.find(
      (source) => source === search.get('utm_source'),
    ),
    utm_medium: PUBLIC_MEDIA.find(
      (medium) => medium === search.get('utm_medium'),
    ),
  })
}

export function trackEvent(
  event: string,
  parameters: Record<string, boolean | number | string | undefined> = {},
) {
  if (
    getAnalyticsConsent() !== 'granted' ||
    !(clientEnv.VITE_GTM_CONTAINER_ID || clientEnv.VITE_GA_MEASUREMENT_ID)
  ) {
    return
  }
  window.dataLayer ??= []
  const context = getPageContext()
  // Keep defaults sanitized for Google-generated events as well as our own.
  pushGoogleCommand('set', context)
  if (clientEnv.VITE_GTM_CONTAINER_ID) {
    window.dataLayer.push({ event, ...context, ...parameters })
  } else if (clientEnv.VITE_GA_MEASUREMENT_ID) {
    pushGoogleCommand('event', event, { ...context, ...parameters })
  }
}

export function trackComparisonCta(
  comparisonSlug: string,
  destination: string,
) {
  if (
    getAnalyticsConsent() !== 'granted' ||
    !(clientEnv.VITE_GTM_CONTAINER_ID || clientEnv.VITE_GA_MEASUREMENT_ID)
  ) {
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
  if (
    getAnalyticsConsent() !== 'granted' ||
    !(clientEnv.VITE_GTM_CONTAINER_ID || clientEnv.VITE_GA_MEASUREMENT_ID)
  ) {
    return
  }
  const internal = getPageContext().traffic_type === 'internal'
  const key = `keenpix.funnel.${event}${internal ? '.internal' : ''}.v1`
  try {
    if (window.localStorage.getItem(key)) {
      return
    }
    window.localStorage.setItem(key, '1')
  } catch {
    return
  }
  trackEvent(event, {
    ...(internal ? {} : getActivationContext()),
    ...parameters,
  })
}
