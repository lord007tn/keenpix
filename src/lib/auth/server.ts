import { apiKey } from '@better-auth/api-key'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api'
import { admin, organization } from 'better-auth/plugins'
import { adminAc, userAc } from 'better-auth/plugins/admin/access'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { prisma } from '@/db'
import { env } from '@/env/server'
import { buildPolarPlugin } from '@/lib/billing/polar-plugin'
import { sendPlatformEmail } from '@/lib/email/send'
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

// A unique, URL-safe slug for a new cloud signup's personal org.
function personalOrgSlug(email: string): string {
  const base =
    email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'org'
  return `${base}-${crypto.randomUUID().slice(0, 8)}`
}

export const auth = betterAuth({
  baseURL: authUrl,
  trustedOrigins: [new URL(authUrl).origin],
  secret: resolveAuthSecret(),
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
    sendResetPassword: ({ user, url }) =>
      sendAuthEmail({
        to: user.email,
        subject: 'Reset your Keenpix password',
        text: `Reset your Keenpix password:\n\n${url}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Reset your Keenpix password:</p><p><a href="${url}">Reset password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
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
        html: `<p>Welcome to Keenpix! Verify your email to get started:</p><p><a href="${url}">Verify email</a></p>`,
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
          html: `<p>Confirm changing your Keenpix email to <strong>${newEmail}</strong>:</p><p><a href="${url}">Confirm email change</a></p><p>If you didn't request this, you can ignore this email and your address stays the same.</p>`,
        }),
    },
    // Self-serve account deletion is cloud-only: self-host operators manage users
    // from the admin surface / database, and deleting the lone operator (owner of
    // the shared org_default) would tear down the whole instance. Password re-auth
    // (no email round-trip) so the guard below can give immediate feedback.
    deleteUser: {
      enabled: isCloud(),
      // An org owner can't just vanish: a live subscription would keep billing an
      // orphaned org, and other members would lose their owner. Block those, and
      // otherwise tear down the solely-owned org so nothing is left dangling.
      beforeDelete: async (user) => {
        const owned = await prisma.member.findMany({
          where: { userId: user.id, role: 'owner' },
          select: { organizationId: true },
        })
        for (const { organizationId } of owned) {
          const org = await prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
              subscription: { select: { status: true } },
              members: { select: { userId: true } },
            },
          })
          if (!org) {
            continue
          }
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
          // Sole owner, no live billing — cascade removes its projects, members,
          // subscription snapshot, and billing customer.
          await prisma.organization.delete({ where: { id: org.id } })
        }
      },
    },
  },
  // Cloud self-signup provisions a personal org (the user owns it) and pins it
  // as the session's active org, so a new cloud user always has an org to act
  // in. Self-host users already have org_default membership from the seed/
  // migration, so both hooks no-op there (gated on isCloud()).
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!isCloud()) {
            return
          }
          const org = await prisma.organization.create({
            data: {
              name: user.name?.trim() || user.email.split('@')[0],
              slug: personalOrgSlug(user.email),
            },
          })
          await prisma.member.create({
            data: { organizationId: org.id, userId: user.id, role: 'owner' },
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
            orderBy: { createdAt: 'asc' },
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
            select: { id: true },
          })
        : null
      if (!member) {
        throw new APIError('FORBIDDEN', {
          message: 'You are not a member of that organization.',
        })
      }
    }),
  },
  plugins: [
    apiKey({
      configId: 'internal',
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
      allowUserToCreateOrganization: isCloud(),
      invitationExpiresIn: 60 * 60 * 48,
      sendInvitationEmail: (data) => {
        const url = `${getAppUrl()}/accept-invite?id=${data.id}`
        const who = data.inviter.user.name || data.inviter.user.email
        return sendAuthEmail({
          to: data.email,
          subject: `You're invited to ${data.organization.name} on Keenpix`,
          text: `${who} invited you to join ${data.organization.name} on Keenpix.\n\nAccept your invitation:\n${url}\n\nThis invitation expires in 48 hours.`,
          html: `<p>${who} invited you to join <strong>${data.organization.name}</strong> on Keenpix.</p><p><a href="${url}">Accept invitation</a></p><p>This invitation expires in 48 hours.</p>`,
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
