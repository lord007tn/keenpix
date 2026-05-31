import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth/server'

export interface SessionUser {
  email: string
  id: string
  name: string | null
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const session = await auth.api
      .getSession({ headers: getRequestHeaders() as unknown as Headers })
      .catch(() => null)
    if (!session?.user) {
      return null
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    }
  },
)
