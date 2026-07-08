import { createFileRoute } from '@tanstack/react-router'
import { readLogs } from '@/actions/logs'
import { resolveActiveOrgId } from '@/lib/auth/active-org'
import { auth } from '@/lib/auth/server'

const STREAM_INTERVAL_MS = 2500
const MAX_SEEN_IDS = 500
// Each poll only needs the most recent rows to detect new arrivals; the initial
// page load fetches a deeper window for scrolling.
const STREAM_FETCH_LIMIT = 60

export const Route = createFileRoute('/api/internal/logs/stream')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleLogStream(request),
    },
  },
})

async function handleLogStream(request: Request) {
  const session = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null)
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Scope the stream to the caller's org (self-host → org_default). Without an
  // active org in cloud there is nothing to stream — and never another tenant's.
  const orgId = resolveActiveOrgId(
    (session.session as { activeOrganizationId?: string | null })
      .activeOrganizationId,
  )
  if (!orgId) {
    return new Response('No active organization', { status: 403 })
  }
  // Narrowed to a definite string for capture by the interval closure below.
  const scopedOrgId = orgId

  const url = new URL(request.url)
  const project =
    url.searchParams.get('project')?.trim() ||
    url.searchParams.get('projectId')?.trim() ||
    undefined
  const encoder = new TextEncoder()
  const seen = new Set<string>()

  const stream = new ReadableStream({
    start(controller) {
      async function writeRows() {
        try {
          const rows = await readLogs(scopedOrgId, project, STREAM_FETCH_LIMIT)
          const next = rows.filter((row) => !seen.has(row.id))
          for (const row of rows) {
            seen.add(row.id)
          }
          if (seen.size > MAX_SEEN_IDS) {
            for (const id of seen) {
              seen.delete(id)
              if (seen.size <= MAX_SEEN_IDS) {
                break
              }
            }
          }
          if (next.length > 0) {
            controller.enqueue(
              encoder.encode(`event: logs\ndata: ${JSON.stringify(next)}\n\n`),
            )
            return
          }
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          controller.enqueue(encoder.encode(': retry\n\n'))
        }
      }

      writeRows()
      const id = setInterval(writeRows, STREAM_INTERVAL_MS)
      request.signal.addEventListener('abort', () => {
        clearInterval(id)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'content-type': 'text/event-stream',
      'x-accel-buffering': 'no',
    },
  })
}
