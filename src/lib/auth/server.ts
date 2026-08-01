import { apiKey } from '@better-auth/api-key'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api'
import { admin, organization } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { defaultStatements } from 'better-auth/plugins/organization/access'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import dayjs from 'dayjs'
import { ensurePersonalOrganizationMembership } from '@/data-access/members'
import { prisma } from '@/db'
import { env } from '@/env/server'
import { buildPolarPlugin } from '@/lib/billing/polar-plugin'
import { assertCanAddSeat, getSeatLimit } from '@/lib/billing/quota'
import { sendPlatformEmail } from '@/lib/email/send'
import { escapeEmailHtml } from '@/lib/email/utils/html/escape'
import { errorContext, logger } from '@/lib/logger/logger'
import { getAppUrl, isCloud } from '@/server/deployment'

// Best-effort transactional email for auth flows: a delivery failure is logged
// but never throws, so a flaky email provider can't break sign-up or sign-in
// (the user can request a resend). Returns nothing.
async function sendAuthEmail(input: {
  html: string
  subject: string
  text: string
  to: string
}): Promise<void> {
  try {
    await sendPlatformEmail(input)
  } catch (error) {
    logger.error(errorContext(error), 'auth email send failed')
  }
}

const isProd = env.NODE_ENV === 'production'

// Subscription statuses that represent a live Polar billing relationship. An org
// in any of these is still billable, so its owner can't delete their account and
// orphan it (see the deleteUser.beforeDelete guard).
const LIVE_SUBSCRIPTION = new Set(['active', 'trialing', 'past_due', 'unpaid'])

// Better Auth's API-key plugin can make organizations the owning reference, but
// its authorization resource is intentionally opt-in. Extend the standard org
// roles so owners/admins can manage keys while members remain read-only tenants.
const organizationAccess = createAccessControl({
  ...defaultStatements,
  apiKey: ['create', 'read', 'update', 'delete'],
})
const organizationRoles = {
  owner: organizationAccess.newRole({
    organization: ['update', 'delete'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'update', 'delete'],
  }),
  admin: organizationAccess.newRole({
    organization: ['update'],
    member: ['create', 'update', 'delete'],
    invitation: ['create', 'cancel'],
    team: ['create', 'update', 'delete'],
    ac: ['create', 'read', 'update', 'delete'],
    apiKey: ['create', 'read', 'update', 'delete'],
  }),
  member: organizationAccess.newRole({
    organization: [],
    member: [],
    invitation: [],
    team: [],
    ac: ['read'],
    apiKey: [],
  }),
}

/** Reject placeholder/known-weak secrets (normalized) so the repo's own dev
 * value — and any human-written placeholder, including the one shipped in
 * `.env.example` — can never sign prod sessions. */
function isWeakSecret(secret: string): boolean {
  const norm = secret.trim().toLowerCase()
  return (
    norm.length < 32 ||
    norm.includes('change-me') ||
    norm.includes('dev-secret') ||
    norm.includes('placeholder') ||
    norm.includes('example') ||
    norm.includes('replace') ||
    norm.includes('generate') ||
    norm.includes('openssl') ||
    norm.includes('rand -hex')
  )
}

function resolveAuthSecret(): string {
  const s = env.BETTER_AUTH_SECRET
  if (s && !isWeakSecret(s)) {
    return s
  }
  if (isProd) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set to a strong, unique value in production — generate one with `openssl rand -hex 32`.',
    )
  }
  return s ?? 'dev-secret-change-me'
}

// Base URL for verification/reset links. Uses the same precedence as the rest of
// the app (KEENPIX_APP_URL || BETTER_AUTH_URL) and inherits getAppUrl()'s
// hosted-production guard, so a cloud deploy that set only KEENPIX_APP_URL no
// longer emits dead localhost links.
const authUrl = getAppUrl()

// Cloud-only Polar billing plugin (checkout/portal/webhooks). Null in self-host
// and in any cloud deploy without a Polar token, so it stays a no-op there.
const polarPlugin = buildPolarPlugin()

export const auth = betterAuth({
  baseURL: authUrl,
  trustedOrigins: [new URL(authUrl).origin],
  secret: resolveAuthSecret(),
  socialProviders:
    isCloud() && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account',
          },
        }
      : {},
  advanced: {
    // Secure cookies once the deployment is served over TLS.
    useSecureCookies: authUrl.startsWith('https://'),
    trustedProxyHeaders: true,
    // Behind the bundled reverse proxy, key per-IP limits on the real client IP.
    ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] },
  },
  // Abuse guard. better-auth's limiter defaults to prod-only; enable it in dev.
  // (In-memory store — back with secondaryStorage for multi-replica.)
  rateLimit: {
    enabled: true,
    customRules: {
      '/sign-in/email': { window: 300, max: 10 },
    },
  },
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    // Cloud is self-serve sign-up; self-host stays invite-only (operators add
    // users from the admin surface). Written as !isCloud() so the self-host
    // value is byte-for-byte unchanged.
    disableSignUp: !isCloud(),
    // Cloud verifies emails (anti-abuse on open sign-up); self-host trusts
    // operator-created accounts.
    requireEmailVerification: isCloud(),
    // A password reset is a compromise-recovery path, so kill every other
    // session — an attacker holding a stolen session must not survive it.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendAuthEmail({
        to: user.email,
        subject: 'Reset your Keenpix password',
        text: `Reset your Keenpix password:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Reset your Keenpix password:</p><p><a href="${escapeEmailHtml(url)}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      }),
  },
  // Verification emails on cloud sign-up; the link signs the user in on success.
  emailVerification: {
    sendOnSignUp: isCloud(),
    autoSignInAfterVerification: true,
    sendVerificationEmail: ({ user, url }) =>
      sendAuthEmail({
        to: user.email,
        subject: 'Verify your Keenpix email',
        text: `Welcome to Keenpix! Verify your email:\n\n${url}`,
        html: `<p>Welcome to Keenpix! Verify your email to get started:</p><p><a href="${escapeEmailHtml(url)}">Verify email</a></p>`,
      }),
  },
  user: {
    // Let a signed-in user change their login email. When the current address is
    // verified (the norm on cloud) better-auth sends a confirmation link to that
    // CURRENT inbox — so a hijacked session can't silently move the login
    // identity; the change only lands once the real owner clicks it. An
    // unverified current address (edge case) is updated directly.
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
      sendChangeEmailConfirmation: ({ user, newEmail, url }) =>
        sendAuthEmail({
          to: user.email,
          subject: 'Confirm your Keenpix email change',
          text: `Confirm changing your Keenpix email to ${newEmail}:\n\n${url}\n\nIf you didn't request this, you can ignore this email and your address stays the same.`,
          html: `<p>Confirm changing your Keenpix email to <strong>${escapeEmailHtml(newEmail)}</strong>:</p><p><a href="${escapeEmailHtml(url)}">Confirm email change</a></p><p>If you didn't request this, you can ignore this email and your address stays the same.</p>`,
        }),
    },
    // Self-serve account deletion is cloud-only: self-host operators manage users
    // from the admin surface / database, and deleting the lone operator (owner of
    // the shared org_default) would tear down the whole instance. A verification
    // link supports both password and OAuth-only accounts before deletion.
    deleteUser: {
      enabled: isCloud(),
      sendDeleteAccountVerification: ({ user, url }) =>
        sendAuthEmail({
          to: user.email,
          subject: 'Confirm your Keenpix account deletion',
          text: `Confirm permanent deletion of your Keenpix account:\n\n${url}\n\nIf you didn't request this, ignore this email.`,
          html: `<p>Confirm permanent deletion of your Keenpix account:</p><p><a href="${escapeEmailHtml(url)}">Delete account</a></p><p>If you didn't request this, ignore this email.</p>`,
        }),
      // An org owner can't just vanish: a live subscription would keep billing an
      // orphaned org, and other members would lose their owner. Block those, and
      // otherwise tear down the solely-owned org so nothing is left dangling.
      beforeDelete: async (user) => {
        const owned = await prisma.member.findMany({
          where: { userId: user.id, role: 'owner' },
          select: { organizationId: true },
        })
        const orgs = await prisma.organization.findMany({
          where: { id: { in: owned.map((m) => m.organizationId) } },
          include: {
            subscription: { select: { status: true } },
            members: { select: { userId: true } },
          },
        })
        // Two passes: validate EVERY owned org first, so a blocker on a later org
        // can never leave an earlier org already deleted (irreversible data loss).
        for (const org of orgs) {
          if (
            org.subscription &&
            LIVE_SUBSCRIPTION.has(org.subscription.status)
          ) {
            throw new APIError('BAD_REQUEST', {
              message: `Cancel the subscription for “${org.name}” before deleting your account.`,
            })
          }
          if (org.members.some((m) => m.userId !== user.id)) {
            throw new APIError('BAD_REQUEST', {
              message: `Transfer ownership of “${org.name}” to another member before deleting your account.`,
            })
          }
        }
        // All clear — tear down the solely-owned orgs in one transaction; each
        // cascade removes its projects, members, subscription, billing customer.
        await prisma.$transaction(
          orgs.map((org) =>
            prisma.organization.delete({ where: { id: org.id } }),
          ),
        )
      },
    },
  },
  // Cloud provisions a personal org only once the identity is verified. Google
  // users arrive verified; email users are provisioned by the update hook after
  // verification. Self-host users already belong to org_default.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!(isCloud() && user.emailVerified)) {
            return
          }
          await ensurePersonalOrganizationMembership({
            userId: user.id,
            email: user.email,
            name: user.name,
          })
        },
      },
      update: {
        after: async (user) => {
          if (!(isCloud() && user.emailVerified)) {
            return
          }
          await ensurePersonalOrganizationMembership({
            userId: user.id,
            email: user.email,
            name: user.name,
          })
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (!isCloud()) {
            return
          }
          const member = await prisma.member.findFirst({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            select: { organizationId: true },
          })
          if (!member) {
            return
          }
          return {
            data: { ...session, activeOrganizationId: member.organizationId },
          }
        },
      },
    },
  },
  // Global request guards. The Polar checkout endpoint takes a client-supplied
  // `referenceId` (the org the subscription is attributed to) and the plugin only
  // proves the caller is authenticated — not that they belong to that org. Without
  // this check any signed-in user could POST another org's id and overwrite its
  // subscription/entitlement. Reject a checkout whose referenceId is not an org
  // the caller is a member of.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/checkout') {
        return
      }
      const referenceId = (ctx.body as { referenceId?: unknown } | undefined)
        ?.referenceId
      if (typeof referenceId !== 'string' || referenceId.length === 0) {
        return
      }
      const session = await getSessionFromCtx(ctx)
      const member = session
        ? await prisma.member.findFirst({
            where: { userId: session.user.id, organizationId: referenceId },
            select: { role: true },
          })
        : null
      if (!member) {
        throw new APIError('FORBIDDEN', {
          message: 'You are not a member of that organization.',
        })
      }
      // Billing is an owner/admin action: a plain member must not be able to
      // subscribe, switch, or cancel the org's plan by POSTing checkout directly.
      if (member.role !== 'owner' && member.role !== 'admin') {
        throw new APIError('FORBIDDEN', {
          message: 'Only organization owners and admins can manage billing.',
        })
      }
    }),
  },
  plugins: [
    apiKey({
      configId: 'internal',
      references: 'organization',
      apiKeyHeaders: ['x-keenpix-api-key'],
      customAPIKeyGetter: (ctx) => {
        const authorization = ctx.headers?.get('authorization')?.trim()
        if (authorization?.toLowerCase().startsWith('bearer ')) {
          return authorization.slice(7).trim()
        }
        return ctx.headers?.get('x-keenpix-api-key')?.trim() ?? null
      },
      defaultPrefix: 'kp_internal_',
      enableMetadata: true,
      requireName: true,
      maximumNameLength: 80,
      rateLimit: {
        enabled: true,
        maxRequests: 10_000,
        timeWindow: 1000 * 60 * 60 * 24,
      },
      permissions: {
        defaultPermissions: {
          projects: ['read', 'write'],
        },
      },
      schema: {
        apikey: {
          modelName: 'apiKey',
        },
      },
    }),
    // Platform-operator admin endpoints (list-users, ban, impersonate) are for the
    // seeded operator only. Bind them to the `super_admin` role — NOT better-auth's
    // default `admin` — so the org-scoped workspace `admin` role can never reach
    // cross-tenant operator powers, and new signups default to `user`. The custom
    // `super_admin` role must be registered in `roles` (reusing the built-in admin
    // permission set) or better-auth rejects it at boot.
    admin({
      roles: { super_admin: adminAc, user: userAc },
      adminRoles: ['super_admin'],
      defaultRole: 'user',
    }),
    // Multi-tenant orgs. Self-host stays single-org: operators create orgs from
    // the admin surface (M5), not self-serve, so only cloud lets users create.
    // Org-member invitations (cloud team management) email a link to /accept-invite.
    organization({
      ac: organizationAccess,
      roles: organizationRoles,
      allowUserToCreateOrganization: isCloud(),
      invitationExpiresIn: 60 * 60 * 48,
      membershipLimit: (_user, organization) => getSeatLimit(organization.id),
      organizationHooks: {
        beforeCreateInvitation: ({ organization }) =>
          assertCanAddSeat(organization.id),
        afterAcceptInvitation: async ({ organization, user }) => {
          // Invite-driven signups may briefly receive a personal workspace when
          // their identity is verified. Remove only that just-created, empty,
          // single-owner workspace; never touch an established user workspace.
          const candidates = await prisma.organization.findMany({
            where: {
              id: { not: organization.id },
              createdAt: {
                gte: dayjs(user.createdAt).subtract(1, 'minute').toDate(),
                lte: dayjs(user.createdAt).add(10, 'minute').toDate(),
              },
              projects: { none: {} },
              billingCustomer: null,
              subscription: null,
              members: { every: { userId: user.id } },
            },
            include: { members: { select: { userId: true, role: true } } },
          })
          const disposable = candidates.filter(
            (candidate) =>
              candidate.members.length === 1 &&
              candidate.members[0]?.role === 'owner',
          )
          if (disposable.length > 0) {
            await prisma.organization.deleteMany({
              where: { id: { in: disposable.map((item) => item.id) } },
            })
          }
        },
      },
      sendInvitationEmail: (data) => {
        const url = `${getAppUrl()}/accept-invite?id=${data.id}`
        const who = data.inviter.user.name || data.inviter.user.email
        return sendAuthEmail({
          to: data.email,
          subject: `You're invited to ${data.organization.name} on Keenpix`,
          text: `${who} invited you to join ${data.organization.name} on Keenpix.\n\nAccept your invitation:\n${url}\n\nThis invitation expires in 48 hours.`,
          html: `<p>${escapeEmailHtml(who)} invited you to join <strong>${escapeEmailHtml(data.organization.name)}</strong> on Keenpix.</p><p><a href="${escapeEmailHtml(url)}">Accept invitation</a></p><p>This invitation expires in 48 hours.</p>`,
        })
      },
    }),
    // Cloud billing (checkout, customer portal, Polar webhook sync). Spread so
    // self-host — where buildPolarPlugin() returns null — adds nothing.
    ...(polarPlugin ? [polarPlugin] : []),
    // Must be last so it can post-process Set-Cookie headers.
    tanstackStartCookies(),
  ],
})
