import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '@/actions/auth'
import { authMiddleware } from '@/lib/auth/guards'

export interface SessionUser {
  createdAt: string | null
  email: string
  emailVerified: boolean
  id: string
  image: string | null
  name: string | null
  role: string
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => getSessionUser(),
)

// The caller's org-level role (owner/admin/member) for the active org, resolved
// by authMiddleware. Null in self-host (single-tenant). Powers client-side gating
// of org-scoped mutations so members aren't shown controls they can't use.
export const getActiveOrgRoleFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => context.orgRole ?? null)
