import { createServerFn } from '@tanstack/react-start'
import { listLogs } from '@/actions/logs'
import { authMiddleware } from '@/lib/auth/guards'
import { logsQuerySchema } from '@/schemas/logs'

export const listLogsFn = createServerFn({ method: 'GET' })
  .inputValidator(logsQuerySchema)
  .middleware([authMiddleware])
  .handler(({ data }) => listLogs(data.project, 200, data))
