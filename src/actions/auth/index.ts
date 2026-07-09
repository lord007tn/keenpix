import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth/server'

export async function getSessionUser() {
  const session = await auth.api
    .getSession({ headers: new Headers(getRequestHeaders()) })
    .catch(() => null)
  if (!session?.user) {
    return null
  }
  const { user } = session
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified ?? false,
    name: user.name ?? null,
    image: user.image ?? null,
    role: user.role ?? 'user',
    // Set by better-auth's admin plugin while an operator is impersonating this
    // user; drives the "stop impersonating" banner. Null in a normal session.
    impersonatedBy: session.session.impersonatedBy ?? null,
    // Serialize for the client boundary; better-auth returns a Date.
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : (user.createdAt ?? null),
  }
}
