const regionNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null
const ISO_ALPHA_2 = /^[A-Z]{2}$/

// Cloudflare can emit pseudo-country codes such as T1 (Tor). Only ISO alpha-2
// values are safe to pass to Intl.DisplayNames; every other value remains a
// useful filter label as-is instead of crashing the analytics route.
export function getAnalyticsCountryLabel(country: string) {
  if (country === 'Unknown' || !ISO_ALPHA_2.test(country)) {
    return country
  }
  try {
    const name = regionNames?.of(country)
    return name && name !== country ? `${name} · ${country}` : country
  } catch {
    return country
  }
}
