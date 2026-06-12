import { createServerFn } from '@tanstack/react-start'
import { getSessionUser } from '@/actions/auth'

export interface SessionUser {
  email: string
  id: string
  name: string | null
  role: string
}

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => getSessionUser(),
)
