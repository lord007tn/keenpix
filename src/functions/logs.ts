import { createServerFn } from '@tanstack/react-start'
import { listLogs } from '@/data-access/logs'
import { authMiddleware } from '@/lib/auth/guards'
import { logsProjectSchema } from '@/schemas/logs'

export const listLogsFn = createServerFn({ method: 'GET' })
  .inputValidator(logsProjectSchema)
  .middleware([authMiddleware])
  .handler(({ data: project }) => listLogs(36, project))
