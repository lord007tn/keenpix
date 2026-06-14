import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
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
import { humanBytes } from '@/shared/format'
import { appPageHead } from '@/shared/seo'
import type { LogRow } from '@/shared/types'
import { useProject } from '@/stores/project-context'

export const Route = createFileRoute('/app/logs/')({
  head: () =>
    appPageHead(
      'Live logs',
      'Live Keenpix request logs with status, format, cache state, latency, and response size filters.',
    ),
  validateSearch: (search: Record<string, unknown>): { project?: string } => ({
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  loaderDeps: ({ search }) => ({ project: search.project }),
  loader: ({ deps }) => listLogsFn({ data: deps.project }),
  component: LogsPage,
})

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
  const initialLogs = Route.useLoaderData()
  const { project } = Route.useSearch()
  const { currentProject, isAll, projects } = useProject()
  const projectName = new Map(projects.map((p) => [p.id, p.name]))
  const [logs, setLogs] = useState(initialLogs)
  const [live, setLive] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState('')
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({})
  const formats = filterValues.format ?? []
  const statuses = filterValues.status ?? []
  const cacheStates = filterValues.cache ?? []
  const domains = isAll ? [] : (filterValues.domain ?? [])

  useEffect(() => {
    setLogs(initialLogs)
  }, [initialLogs])

  useEffect(() => {
    if (!live) {
      return
    }
    const params = new URLSearchParams()
    if (project) {
      params.set('project', project)
    }
    const source = new EventSource(
      `/api/internal/logs/stream${params.size ? `?${params}` : ''}`,
    )
    source.addEventListener('logs', (event) => {
      const rows = JSON.parse((event as MessageEvent).data) as LogRow[]
      if (rows.length === 0) {
        return
      }
      setLogs((current) => {
        const known = new Set(current.map((row) => row.id))
        const next = rows.filter((row) => !known.has(row.id)).reverse()
        return [...next, ...current].slice(0, 500)
      })
    })
    return () => source.close()
  }, [live, project])

  useEffect(() => {
    if (!live) {
      return
    }
    setFilterValues((values) =>
      isAll && values.domain ? { ...values, domain: [] } : values,
    )
  }, [isAll, live])

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
  const domainOptions = useMemo(
    () =>
      uniq(logs.map((l) => l.sourceHost ?? ''))
        .filter(Boolean)
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
    if (domains.length > 0 && !domains.includes(l.sourceHost ?? '')) {
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
    // Source-domain filter is per-project; options are the hosts actually seen
    // in this window (subdomains included), not the bare allowlist.
    if (!isAll && domainOptions.length > 0) {
      f.push({ key: 'domain', label: 'Domain', options: domainOptions })
    }
    return f
  }, [formatOptions, statusOptions, domainOptions, isAll])

  function toggleExpanded(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // chevron + timestamp + (project|domain) + path + width + format + status +
  // cache + latency + bytes — exactly one of project/domain renders.
  const columnCount = 10

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
        subtitle={
          isAll
            ? 'Every request that hit keenpix — newest first, streamed from the server.'
            : `Every request for ${currentProject?.name ?? 'this project'} — newest first, streamed from the server.`
        }
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
            className="px-8 font-mono text-xs"
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filter by path… e.g. /products/"
            value={filter}
          />
          {filter ? (
            <button
              aria-label="Clear path search"
              className="absolute top-2.5 right-2.5 text-muted-foreground outline-none hover:text-foreground"
              onClick={() => setFilter('')}
              type="button"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DataFilters
            fields={fields}
            onChange={(key, next) =>
              setFilterValues((v) => ({ ...v, [key]: next }))
            }
            onClear={() => {
              setFilterValues({})
              setFilter('')
            }}
            values={filterValues}
          />
          <span className="ml-auto text-muted-foreground text-xs tabular-nums">
            {filtered.length} of {logs.length}
          </span>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <Table containerClassName="max-h-[calc(100vh-22rem)] min-h-64 overflow-auto">
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Timestamp</TableHead>
              {isAll ? (
                <TableHead>Project</TableHead>
              ) : (
                <TableHead>Domain</TableHead>
              )}
              <TableHead className="w-full">Path</TableHead>
              <TableHead className="text-right">Width</TableHead>
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Status</TableHead>
              <TableHead>Cache</TableHead>
              <TableHead className="text-right">Latency</TableHead>
              <TableHead className="text-right">Bytes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="font-mono text-xs">
            {filtered.map((l) => {
              const isOpen = expanded.has(l.id)
              return (
                <Fragment key={l.id}>
                  <TableRow
                    aria-expanded={isOpen}
                    className="cursor-pointer aria-expanded:bg-muted/50"
                    onClick={() => toggleExpanded(l.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleExpanded(l.id)
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell className="text-muted-foreground">
                      {isOpen ? (
                        <ChevronDownIcon className="size-3.5" />
                      ) : (
                        <ChevronRightIcon className="size-3.5" />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dayjs(l.ts).format('MMM D, HH:mm:ss')}
                    </TableCell>
                    {isAll ? (
                      <TableCell className="text-foreground">
                        {projectName.get(l.projectId) ?? l.projectId}
                      </TableCell>
                    ) : (
                      <TableCell className="text-foreground">
                        {l.sourceHost ?? '—'}
                      </TableCell>
                    )}
                    <TableCell className="w-full max-w-0 truncate">
                      {l.path}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {l.w}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {l.format}
                    </TableCell>
                    <TableCell
                      className={`text-right ${l.status === 200 ? 'text-success-text' : 'text-destructive-text'}`}
                    >
                      {l.status}
                    </TableCell>
                    <TableCell
                      className={
                        l.cached ? 'text-success-text' : 'text-primary'
                      }
                    >
                      {l.cached ? 'HIT' : 'MISS'}
                    </TableCell>
                    <TableCell
                      className={`text-right ${latencyClass(l.latency)}`}
                    >
                      {l.latency}ms
                    </TableCell>
                    <TableCell className="text-right">
                      {humanBytes(l.bytesOut, 0)}
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        className="bg-muted/30 p-0"
                        colSpan={columnCount}
                      >
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-3 lg:grid-cols-4">
                          {[
                            { full: true, label: 'Path', value: l.path },
                            { label: 'Request ID', value: l.id },
                            {
                              label: 'Project',
                              value:
                                projectName.get(l.projectId) ?? l.projectId,
                            },
                            { label: 'Domain', value: l.sourceHost ?? '—' },
                            {
                              label: 'Timestamp',
                              value: dayjs(l.ts).format('MMM D, YYYY HH:mm:ss'),
                            },
                            { label: 'Status', value: String(l.status) },
                            { label: 'Format', value: l.format },
                            { label: 'Width', value: `${l.w}px` },
                            { label: 'Quality', value: String(l.q) },
                            {
                              label: 'Cache',
                              value: l.cached ? 'HIT' : 'MISS',
                            },
                            { label: 'Latency', value: `${l.latency}ms` },
                            { label: 'Bytes in', value: humanBytes(l.bytesIn) },
                            {
                              label: 'Bytes out',
                              value: humanBytes(l.bytesOut),
                            },
                            {
                              label: 'Saved',
                              value:
                                l.bytesSaved > 0
                                  ? humanBytes(l.bytesSaved)
                                  : '—',
                            },
                          ].map((d) => (
                            <div
                              className={d.full ? 'col-span-full' : ''}
                              key={d.label}
                            >
                              <dt className="text-[11px] text-muted-foreground uppercase tracking-wide">
                                {d.label}
                              </dt>
                              <dd className="mt-0.5 break-all text-foreground">
                                {d.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-14 text-center text-muted-foreground"
                  colSpan={columnCount}
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
