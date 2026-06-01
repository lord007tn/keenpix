import { createFileRoute, useRouter } from '@tanstack/react-router'
import { DownloadIcon, SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataFilters, type FilterField } from '@/components/app/data-filters'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listLogsFn } from '@/functions/logs'
import { fmtBytes } from '@/shared/format'
import type { LogRow } from '@/shared/types'
import { useProject } from '@/stores/project-context'

export const Route = createFileRoute('/app/logs/')({
  validateSearch: (search: Record<string, unknown>): { project?: string } => ({
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  loaderDeps: ({ search }) => ({ project: search.project }),
  loader: ({ deps }) => listLogsFn({ data: deps.project }),
  component: LogsPage,
})

const REFRESH_MS = 5000

const CACHE_OPTIONS = [
  { value: 'hit', label: 'Cache hit' },
  { value: 'miss', label: 'Cache miss' },
]

function uniq(values: string[]): string[] {
  return [...new Set(values)]
}

function latencyClass(latencyMs: number): string {
  if (latencyMs < 30) {
    return 'text-success-text'
  }
  if (latencyMs < 100) {
    return ''
  }
  return 'text-warning-text'
}

function exportNdjson(rows: LogRow[]) {
  const text = rows.map((r) => JSON.stringify(r)).join('\n')
  const blob = new Blob([text], { type: 'application/x-ndjson' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'keenpix-logs.ndjson'
  a.click()
  URL.revokeObjectURL(url)
}

function LogsPage() {
  const logs = Route.useLoaderData()
  const router = useRouter()
  const { currentProject, isAll, projects } = useProject()
  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const [live, setLive] = useState(true)
  const [filter, setFilter] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({})
  const formats = filterValues.format ?? []
  const statuses = filterValues.status ?? []
  const cacheStates = filterValues.cache ?? []

  useEffect(() => {
    if (!live) {
      return
    }
    const id = setInterval(() => {
      router.invalidate()
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [live, router])

  const formatOptions = useMemo(
    () => uniq(logs.map((l) => l.format)).map((v) => ({ value: v, label: v })),
    [logs],
  )
  const statusOptions = useMemo(
    () =>
      uniq(logs.map((l) => String(l.status)))
        .sort()
        .map((v) => ({ value: v, label: v })),
    [logs],
  )
  const filtered = logs.filter((l) => {
    if (filter && !l.path.toLowerCase().includes(filter.toLowerCase())) {
      return false
    }
    if (formats.length > 0 && !formats.includes(l.format)) {
      return false
    }
    if (statuses.length > 0 && !statuses.includes(String(l.status))) {
      return false
    }
    if (
      cacheStates.length > 0 &&
      !cacheStates.includes(l.cached ? 'hit' : 'miss')
    ) {
      return false
    }
    return true
  })

  const fields = useMemo<FilterField[]>(() => {
    const f: FilterField[] = [
      { key: 'format', label: 'Format', options: formatOptions },
      { key: 'status', label: 'Status', options: statusOptions },
      { key: 'cache', label: 'Cache', options: CACHE_OPTIONS },
    ]
    return f
  }, [formatOptions, statusOptions])

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        actions={
          <>
            <Button
              onClick={() => setLive((v) => !v)}
              size="sm"
              variant={live ? 'success' : 'outline'}
            >
              <span
                className={`size-1.5 rounded-full bg-current ${live ? 'animate-pulse' : ''}`}
              />
              {live ? 'Live' : 'Paused'}
            </Button>
            <Button
              disabled={filtered.length === 0}
              onClick={() => exportNdjson(filtered)}
              size="sm"
              variant="outline"
            >
              <DownloadIcon data-icon="inline-start" />
              NDJSON
            </Button>
          </>
        }
        eyebrow={isAll ? 'All projects' : currentProject?.name}
        subtitle="Every request that hit keenpix — newest first, auto-refreshing."
        title="Live logs"
      />

      <div aria-live="polite" className="sr-only" role="status">
        {live && filtered[0]
          ? `Newest request: ${filtered[0].path}, status ${filtered[0].status}, ${filtered[0].format}, ${filtered[0].latency}ms, ${filtered[0].cached ? 'cache hit' : 'cache miss'}`
          : ''}
      </div>

      <Card className="flex flex-col gap-3 p-3">
        <div className="relative">
          <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8 font-mono text-xs"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter by path… e.g. /products/"
            value={filter}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataFilters
            fields={fields}
            onChange={(key, next) =>
              setFilterValues((v) => ({ ...v, [key]: next }))
            }
            onClear={() => setFilterValues({})}
            values={filterValues}
          />
          <span className="ml-auto text-muted-foreground text-xs tabular-nums">
            {filtered.length} of {logs.length}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              {isAll ? <TableHead>Project</TableHead> : null}
              <TableHead>Path</TableHead>
              <TableHead className="text-right">Width</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead>Cache</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead className="text-right">Bytes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-xs">
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-muted-foreground">{l.ts}</TableCell>
                {isAll ? (
                  <TableCell className="text-foreground">
                    {projectName.get(l.projectId) ?? l.projectId}
                  </TableCell>
                ) : null}
                <TableCell className="max-w-[1px] truncate">{l.path}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {l.w}
                </TableCell>
                <TableCell className="text-foreground">{l.format}</TableCell>
                <TableCell
                  className={`text-right ${l.status === 200 ? 'text-success-text' : 'text-destructive-text'}`}
                >
                  {l.status}
                </TableCell>
                <TableCell
                  className={l.cached ? 'text-success-text' : 'text-primary'}
                >
                  {l.cached ? 'HIT' : 'MISS'}
                </TableCell>
                <TableCell className={`text-right ${latencyClass(l.latency)}`}>
                  {l.latency}ms
                </TableCell>
                <TableCell className="text-right">
                  {fmtBytes(l.bytesOut, 0)}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-14 text-center text-muted-foreground"
                  colSpan={isAll ? 9 : 8}
                >
                  No requests match these filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
