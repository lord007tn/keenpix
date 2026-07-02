import type { LogListFilters } from '@/data-access/logs'
import { listLogs as listLogsInDb } from '@/data-access/logs'
import { resolveProjectId } from '@/data-access/projects'

export async function listLogs(
  project?: string,
  limit = 200,
  filters?: LogListFilters,
) {
  return listLogsInDb({
    filters,
    limit,
    projectId: await resolveProjectId(project),
  })
}
