import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth/server'

/** Server-fn middleware: rejects unauthenticated calls, exposes userId in context. */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const session = await auth.api
      .getSession({ headers: new Headers(getRequestHeaders()) })
      .catch(() => null)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }
    return next({
      context: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
        role: session.user.role ?? 'user',
      },
    })
  },
)

export function requireSuperAdmin(context: { role?: string }) {
  if (context.role !== 'super_admin') {
    throw new Error('Super admin access required')
  }
}
