import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '@/actions/auth'

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
