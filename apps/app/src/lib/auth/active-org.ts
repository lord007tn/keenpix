import { isCloud } from '@/server/deployment'

// The single org every self-host install runs under. Historically this was the
// hardcoded DEFAULT_ORG; it stays the one-and-only org in self-host mode.
export const DEFAULT_ORG_ID = 'org_default'

// Resolve the caller's active organization for request scoping.
//
// Self-host (`!isCloud()`): ALWAYS `org_default`, regardless of the session —
// byte-for-byte identical to the pre-multi-tenant behavior, so threading this
// through reads is a no-op on an upgraded self-host instance.
//
// Cloud: the org the session is currently acting in (`session.activeOrganizationId`,
// backfilled to `org_default` for upgraded sessions by the M2 migration and set
// per-org on signup/switch). May be `null` before an org is selected — cloud
// callers enforce membership and reject a null/foreign org.
export function resolveActiveOrgId(
  activeOrganizationId: string | null | undefined,
): string | null {
  if (!isCloud()) {
    return DEFAULT_ORG_ID
  }
  return activeOrganizationId ?? null
}
