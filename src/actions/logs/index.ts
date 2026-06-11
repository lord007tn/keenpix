import { listLogs as listLogsInDb } from '@/data-access/logs'
import { resolveProjectId } from '@/data-access/projects'

export async function listLogs(project?: string, limit = 200) {
  return listLogsInDb(limit, await resolveProjectId(project))
}
