import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import {
  ensurePersonalOrganizationMembership,
  getLatestMembership,
  getMemberRole,
  setSessionActiveOrganization,
} from '@/data-access/members'
import { resolveActiveOrgId } from '@/lib/auth/active-org'
import { auth } from '@/lib/auth/server'
import { isCloud } from '@/server/deployment'

// Server-fn middleware: reject unauthenticated calls and expose the authenticated
// user's identity — and their active organization + org role — to downstream
// handlers. The DB lookups here live inside `.server()`, so they (and their
// prisma import) are stripped from the client bundle.
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await auth.api
      .getSession({ headers: new Headers(getRequestHeaders()) })
      .catch(() => null)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }
    // Active org for tenant scoping. Self-host always resolves to org_default;
    // cloud reads it from the session (organization plugin). Handlers scope
    // reads/writes by this instead of the old hardcoded DEFAULT_ORG.
    const authSession = session.session as {
      activeOrganizationId?: string | null
      impersonatedBy?: string | null
    }
    const activeOrganizationId = authSession.activeOrganizationId
    let orgId = resolveActiveOrgId(activeOrganizationId)
    // Org-level role for per-org authz (owner/admin/member), resolved once here so
    // the guards stay pure/synchronous. Only needed in cloud — self-host is
    // single-tenant, so skip the query entirely there.
    let orgRole =
      isCloud() && orgId ? await getMemberRole(session.user.id, orgId) : null
    // An organization member can be removed while one of their existing
    // sessions still points at that organization. Better Auth only clears the
    // acting session on self-removal, so fail closed here before any custom
    // server function can trust a stale activeOrganizationId.
    if (isCloud() && !orgRole) {
      const membership =
        (await getLatestMembership(session.user.id)) ??
        (session.user.emailVerified
          ? await ensurePersonalOrganizationMembership({
              userId: session.user.id,
              email: session.user.email,
              name: session.user.name,
            })
          : null)
      if (membership) {
        orgId = membership.organizationId
        orgRole = membership.role
        await setSessionActiveOrganization(
          session.session.id,
          membership.organizationId,
        )
      }
      if (!orgRole) {
        throw new Error('You are not a member of the active organization.')
      }
    }
    return next({
      context: {
        userId: session.user.id,
        email: session.user.email,
        impersonatedBy:
          typeof authSession.impersonatedBy === 'string'
            ? authSession.impersonatedBy
            : null,
        name: session.user.name ?? null,
        role: session.user.role ?? 'user',
        orgId,
        orgRole,
      },
    })
  },
)

export function requireSuperAdmin(context: { role?: string }) {
  if (context.role !== 'super_admin') {
    throw new Error('Super admin access required')
  }
}

// Narrow the middleware's `orgId` (string | null) to a required org for tenant-
// scoped reads/writes. Self-host always resolves to org_default; cloud throws
// when the caller has no active org selected, so no query can fall back to a
// shared/default tenant.
export function requireActiveOrg(context: {
  orgId?: string | null
  orgRole?: string | null
}): string {
  if (!context.orgId) {
    throw new Error('No active organization')
  }
  // Defense in depth for tenant reads. authMiddleware performs this check at
  // the boundary, but retaining it here prevents a future caller from passing a
  // stale cloud organization through a hand-built context.
  if (isCloud() && !context.orgRole) {
    throw new Error('You are not a member of the active organization.')
  }
  return context.orgId
}

// Instance-level config (SMTP, Cloudflare, cache/operations) is single-row and
// process-wide. In cloud it is platform-managed via env, so tenants — even a
// super_admin — must not read or write it: fail closed. In self-host this is a
// no-op and the existing requireSuperAdmin check stands.
export function requireSelfHost() {
  if (isCloud()) {
    throw new Error('This setting is managed by the platform')
  }
}

// Gate a destructive/config org mutation on the caller's org-level role (resolved
// by authMiddleware). ONLY enforced in cloud: self-host is single-tenant (one
// operator org), where the membership model is intentionally loose, so per-org
// roles must not gate there. In cloud, a low-trust `member` can read but not
// mutate; owner/admin can mutate.
export function requireOrgRole(
  context: { orgId?: string | null; orgRole?: string | null },
  allowed: string[],
): string {
  const orgId = requireActiveOrg(context)
  if (!isCloud()) {
    return orgId
  }
  if (!(context.orgRole && allowed.includes(context.orgRole))) {
    throw new Error(
      'You do not have permission to do this in this organization.',
    )
  }
  return orgId
}

export function requireOrgAdmin(context: {
  orgId?: string | null
  orgRole?: string | null
}): string {
  return requireOrgRole(context, ['owner', 'admin'])
}

export function requireOrgOwner(context: {
  orgId?: string | null
  orgRole?: string | null
}): string {
  return requireOrgRole(context, ['owner'])
}
