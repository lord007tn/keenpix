import { createServerFn } from '@tanstack/react-start'

export interface SessionUser {
  email: string
  id: string
  name: string | null
  role: string
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SessionUser | null> => {
    const [{ getRequestHeaders }, { auth }] = await Promise.all([
      import('@tanstack/react-start/server'),
      import('@/lib/auth/server'),
    ])
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
      role: session.user.role ?? 'user',
    }
  },
)
