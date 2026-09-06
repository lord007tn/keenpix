import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getErrorMessage } from '@/errors/common'
import { getAllowedHostStatsFn } from '@/functions/analytics'
import { addAllowedHostFn, removeAllowedHostFn } from '@/functions/projects'
import { allowedHostSchema } from '@/schemas/projects'
import { compactNumber, humanBytes } from '@/shared/format'
import type { AllowedHostStat } from '@/shared/types'
import { getFieldError } from '@/utils/validation/form-errors'

// Searchable per-host table. Scales to hundreds of allowlisted hosts and shows
// last-30d traffic per host so it's easy to find a specific one and spot
// idle/blocked entries. Add/remove still hit the same project functions.
export function AllowedHosts({
  projectId,
  initial,
}: {
  projectId: string
  initial: string[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<AllowedHostStat[]>(
    initial.map((host) => ({
      host,
      allowed: true,
      requests: 0,
      hitRate: 0,
      bandwidthSaved: 0,
      lastSeen: null,
    })),
  )
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmHost, setConfirmHost] = useState<AllowedHostStat | null>(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(
        await getAllowedHostStatsFn({ data: { projectId, range: '30d' } }),
      )
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const form = useForm({
    defaultValues: { projectId, host: '' },
    validators: { onChange: allowedHostSchema, onSubmit: allowedHostSchema },
    onSubmit: async ({ value }) => {
      try {
        await addAllowedHostFn({
          data: allowedHostSchema.parse({ ...value, projectId }),
        })
        form.reset()
        toast.success('Allowed host added')
        await load()
        await router.invalidate()
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not add host'))
      }
    },
  })

  async function allow(host: string) {
    try {
      await addAllowedHostFn({
        data: allowedHostSchema.parse({ projectId, host }),
      })
      toast.success(`Allowed ${host}`)
      await load()
      await router.invalidate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not allow host'))
    }
  }

  async function remove(host: string) {
    setRemoving(true)
    try {
      await removeAllowedHostFn({
        data: allowedHostSchema.parse({ projectId, host }),
      })
      toast.success(`Removed ${host}`)
      setConfirmHost(null)
      await load()
      await router.invalidate()
    } catch {
      toast.error('Could not remove host')
    } finally {
      setRemoving(false)
    }
  }

  const allowedCount = rows.filter((r) => r.allowed).length
  const unlisted = rows.length - allowedCount
  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter((r) => r.host.toLowerCase().includes(q))
    : rows

  let emptyMessage = 'No hosts match your search.'
  if (loading) {
    emptyMessage = 'Loading hosts…'
  } else if (rows.length === 0) {
    emptyMessage = 'No hosts yet — keenpix will refuse all origins.'
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <form
        className="flex items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field name="host">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex gap-2">
                  <Input
                    aria-invalid={!!error}
                    aria-label="Add allowed host"
                    className="font-mono text-xs"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="images.example.com"
                    value={field.state.value}
                  />
                  <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        disabled={!canSubmit || isSubmitting}
                        size="sm"
                        type="submit"
                      >
                        <PlusIcon data-icon="inline-start" />
                        Add host
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
                {error ? (
                  <p className="text-destructive text-xs">{error}</p>
                ) : null}
              </div>
            )
          }}
        </form.Field>
      </form>

      <div className="relative">
        <SearchIcon className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          className="pl-8 font-mono text-xs"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search hosts…"
          value={search}
        />
      </div>

      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>
          {allowedCount} allowed {allowedCount === 1 ? 'host' : 'hosts'}
          {unlisted > 0 ? ` · ${unlisted} seen but not allowed` : ''}
        </span>
        <span className="tabular-nums">{filtered.length} shown</span>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table containerClassName="max-h-96 overflow-auto">
          <TableHeader className="sticky top-0 z-10 bg-card [&_th]:bg-card">
            <TableRow>
              <TableHead>Host</TableHead>
              <TableHead className="text-right">Requests 30d</TableHead>
              <TableHead className="text-right">Hit rate</TableHead>
              <TableHead className="text-right">Saved</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.host}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs">{r.host}</span>
                    {r.allowed ? null : (
                      <Badge variant="warning">not allowed</Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {compactNumber(r.requests)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.requests > 0 ? `${r.hitRate.toFixed(0)}%` : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.bandwidthSaved > 0 ? humanBytes(r.bandwidthSaved, 0) : '—'}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {r.lastSeen ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  {r.allowed ? (
                    <Button
                      aria-label={`Remove ${r.host}`}
                      onClick={() => setConfirmHost(r)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => allow(r.host)}
                      size="sm"
                      variant="outline"
                    >
                      <PlusIcon data-icon="inline-start" />
                      Allow
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground text-sm"
                  colSpan={6}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            setConfirmHost(null)
          }
        }}
        open={confirmHost !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove allowed host?</DialogTitle>
            <DialogDescription>
              Keenpix will block new fetches from{' '}
              <span className="font-mono">{confirmHost?.host}</span>
              {confirmHost && confirmHost.requests > 0
                ? ` — it served ${compactNumber(confirmHost.requests)} requests in the last 30 days.`
                : '.'}
              {allowedCount === 1
                ? ' This leaves the project with no allowed hosts.'
                : ''}{' '}
              Previously cached images may remain available until their caches
              expire or are cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmHost(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={removing}
              onClick={() => {
                if (confirmHost) {
                  remove(confirmHost.host)
                }
              }}
              variant="destructive"
            >
              {removing ? 'Removing…' : 'Remove host'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
