import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { SettingRow } from '@/components/app/setting-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/errors/common'
import {
  getOperationsConfigFn,
  updateOperationsConfigFn,
} from '@/functions/admin'

type Config = Awaited<ReturnType<typeof getOperationsConfigFn>>

// Instance operations configuration. Disk + memory cache caps are editable and
// hot-applied to the running instance; concurrency + queue depth are env-set
// and shown read-only.
export function OperationsConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [disk, setDisk] = useState('')
  const [memory, setMemory] = useState('')
  const [pending, setPending] = useState(false)

  const sync = useCallback((c: Config) => {
    setConfig(c)
    setDisk(String(c.diskCacheMaxMb))
    setMemory(String(c.memoryCacheMaxMb))
  }, [])

  const load = useCallback(async () => {
    sync(await getOperationsConfigFn())
  }, [sync])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    setPending(true)
    try {
      sync(
        await updateOperationsConfigFn({
          data: {
            diskCacheMaxMb: Number(disk),
            memoryCacheMaxMb: Number(memory),
          },
        }),
      )
      toast.success('Operations configuration saved')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save configuration'))
    } finally {
      setPending(false)
    }
  }

  const changed =
    config !== null &&
    (Number(disk) !== config.diskCacheMaxMb ||
      Number(memory) !== config.memoryCacheMaxMb)

  return (
    <div className="flex flex-col gap-4">
      <div className="divide-y">
        <SettingRow
          className="py-4 first:pt-0 sm:items-center"
          description="Maximum on-disk transform cache. Applied immediately — the LRU trims down if you lower it."
          label="Disk cache cap"
        >
          <div className="flex items-center gap-2">
            <Input
              aria-label="Disk cache cap (MB)"
              className="w-28 text-right font-mono tabular-nums"
              disabled={pending || config === null}
              inputMode="numeric"
              onChange={(e) => setDisk(e.target.value)}
              type="number"
              value={disk}
            />
            <span className="text-muted-foreground text-sm">MB</span>
            {config?.diskOverride ? (
              <Badge variant="secondary">override</Badge>
            ) : (
              <Badge variant="outline">env default</Badge>
            )}
          </div>
        </SettingRow>

        <SettingRow
          className="py-4 sm:items-center"
          description="In-process hot cache. 0 disables it. Changing this rebuilds the cache (drops hot items)."
          label="Memory cache cap"
        >
          <div className="flex items-center gap-2">
            <Input
              aria-label="Memory cache cap (MB)"
              className="w-28 text-right font-mono tabular-nums"
              disabled={pending || config === null}
              inputMode="numeric"
              onChange={(e) => setMemory(e.target.value)}
              type="number"
              value={memory}
            />
            <span className="text-muted-foreground text-sm">MB</span>
            {config?.memoryOverride ? (
              <Badge variant="secondary">override</Badge>
            ) : (
              <Badge variant="outline">env default</Badge>
            )}
          </div>
        </SettingRow>

        <SettingRow
          className="py-4 sm:items-center"
          description="Concurrent sharp workers. Set via KEENPIX_MAX_CONCURRENCY; applies at startup."
          label="Transform concurrency"
        >
          <span className="font-mono text-sm tabular-nums">
            {config?.transformConcurrency ?? '—'}
          </span>
        </SettingRow>

        <SettingRow
          className="py-4 last:pb-0 sm:items-center"
          description="Max queued transforms before requests shed load. Set via KEENPIX_MAX_QUEUE; applies at startup."
          label="Max queue depth"
        >
          <span className="font-mono text-sm tabular-nums">
            {config?.maxQueueDepth ?? '—'}
          </span>
        </SettingRow>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Cache caps apply to this running instance immediately and persist —
          re-asserted on next load after a restart.
        </p>
        <Button disabled={pending || !changed} onClick={save}>
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
