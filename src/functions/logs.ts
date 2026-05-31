import { createServerFn } from '@tanstack/react-start'
import { listLogs } from '@/data-access/logs'
import { authMiddleware } from '@/lib/auth/guards'

export const listLogsFn = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((project?: string): string | undefined =>
    typeof project === 'string' && project ? project : undefined,
  )
  .handler(({ data: project }) => listLogs(36, project))
