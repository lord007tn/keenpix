import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth/server'

export async function getSessionUser() {
  const session = await auth.api
    .getSession({ headers: new Headers(getRequestHeaders()) })
    .catch(() => null)
  if (!session?.user) {
    return null
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    role: session.user.role ?? 'user',
  }
}
