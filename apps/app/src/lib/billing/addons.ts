export const CUSTOM_DOMAIN_ADDON = {
  kind: 'custom_domains',
  name: 'Additional custom domains',
  priceMonthlyUsd: 5,
  units: 5,
} as const

export type SubscriptionAddonKind = typeof CUSTOM_DOMAIN_ADDON.kind

export function isSubscriptionAddonKind(
  value: unknown,
): value is SubscriptionAddonKind {
  return value === CUSTOM_DOMAIN_ADDON.kind
}
