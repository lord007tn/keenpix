import { listLogs as listLogsInDb } from '@/data-access/logs'
import { resolveProjectId } from '@/data-access/projects'

export async function listLogs(project?: string) {
  return listLogsInDb(36, await resolveProjectId(project))
}
