import dayjs from 'dayjs'
import { listBlockedOriginRequests } from '@/data-access/blocked-origin-requests'
import { getProject, listProjects } from '@/data-access/projects'

const SOURCE_HOST =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/

export async function getOriginAllowlistWarnings(
  orgId: string,
  projectId?: string,
) {
  const [rows, projects] = await Promise.all([
    listBlockedOriginRequests({
      orgId,
      projectId,
      // Include the overlapping hour: rollups cannot split its requests at
      // the cutoff. The UI describes this as roughly a day (up to 25 hours).
      since: dayjs().subtract(24, 'hour').startOf('hour').toDate(),
    }),
    projectId
      ? getProject(projectId, orgId).then((project) =>
          project ? [project] : [],
        )
      : listProjects(orgId),
  ])
  const projectsById = new Map(projects.map((project) => [project.id, project]))
  return rows.flatMap((row) => {
    const project = projectsById.get(row.projectId)
    const host = row.sourceHost.toLowerCase()
    if (
      !(project && SOURCE_HOST.test(host)) ||
      project.allowedOrigins.some((allowedOrigin) => {
        const allowed = allowedOrigin.toLowerCase()
        return host === allowed || host.endsWith(`.${allowed}`)
      })
    ) {
      return []
    }
    return [
      {
        projectId: project.id,
        projectName: project.name,
        host,
        blockedRequests: row._sum.requests ?? 0,
      },
    ]
  })
}
