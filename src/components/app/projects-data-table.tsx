import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { ReactTableDevtools } from '@tanstack/react-table-devtools'
import { ArrowUpDownIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { fmtNum } from '@/shared/format'
import type { Project, ProjectStat } from '@/shared/types'

interface ProjectRow extends Project {
  hitRate: number
  requests: number
}

const ENVS = ['all', 'production', 'staging', 'development']

const columns: ColumnDef<ProjectRow>[] = [
  {
    accessorKey: 'name',
    header: 'Project',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span
          className="size-7 shrink-0 rounded-md"
          style={{
            background: `linear-gradient(135deg, ${row.original.color1}, ${row.original.color2})`,
          }}
        />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.original.name}</span>
          <span className="truncate font-mono text-muted-foreground text-xs">
            {row.original.origin}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'env',
    header: 'Environment',
    cell: ({ row }) => (
      <Badge
        variant={row.original.env === 'production' ? 'success' : 'warning'}
      >
        {row.original.env}
      </Badge>
    ),
  },
  {
    accessorKey: 'requests',
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        24h requests
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{fmtNum(row.original.requests)}</span>
    ),
  },
  {
    accessorKey: 'hitRate',
    header: ({ column }) => (
      <SortHeader
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Hit rate
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.hitRate.toFixed(1)}%</span>
    ),
  },
]

function SortHeader({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button className="-ml-2 h-8" onClick={onClick} size="sm" variant="ghost">
      {children}
      <ArrowUpDownIcon className="ml-1 size-3.5" />
    </Button>
  )
}

export function ProjectsDataTable({
  projects,
  stats,
  activeId,
  onSelect,
}: {
  projects: Project[]
  stats: Record<string, ProjectStat>
  activeId?: string
  onSelect: (id: string) => void
}) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [env, setEnv] = useState('all')

  const rows = useMemo<ProjectRow[]>(
    () =>
      projects.map((p) => ({
        ...p,
        requests: stats[p.id]?.requests ?? 0,
        hitRate: stats[p.id]?.hitRate ?? 0,
      })),
    [projects, stats],
  )
  const data = useMemo(
    () => (env === 'all' ? rows : rows.filter((r) => r.env === env)),
    [rows, env],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs onValueChange={setEnv} value={env}>
          <TabsList>
            {ENVS.map((e) => (
              <TabsTrigger className="capitalize" key={e} value={e}>
                {e === 'all' ? 'All projects' : e}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <NewProjectDialog />
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((r) => (
                <TableRow
                  className="cursor-pointer"
                  data-state={
                    r.original.id === activeId ? 'selected' : undefined
                  }
                  key={r.id}
                  onClick={() => onSelect(r.original.id)}
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-24 text-center text-muted-foreground"
                  colSpan={columns.length}
                >
                  No projects in this environment.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      {import.meta.env.DEV ? (
        <ReactTableDevtools
          containerElement="div"
          initialIsOpen={false}
          table={table}
        />
      ) : null}
    </div>
  )
}
