import { listLogs as listLogsInDb } from '@/data-access/logs'

export function listLogs(project?: string) {
  return listLogsInDb(36, project)
}
