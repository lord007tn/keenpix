import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import { updateProjectSettingsFn } from '@/functions/projects'
import type { Project } from '@/shared/types'

interface Patch {
  autoFormat?: boolean
  defaultQuality?: number
  stripMetadata?: boolean
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description ? (
          <span className="text-muted-foreground text-xs">{description}</span>
        ) : null}
      </div>
      <div className="w-full sm:w-auto sm:shrink-0">{children}</div>
    </div>
  )
}

/** Editable per-project pipeline defaults — persisted via updateProjectSettingsFn. */
export function PipelineSettings({ project }: { project: Project }) {
  const router = useRouter()
  const [autoFormat, setAutoFormat] = useState(project.autoFormat)
  const [stripMetadata, setStripMetadata] = useState(project.stripMetadata)
  const [quality, setQuality] = useState(String(project.defaultQuality))
  const [pending, setPending] = useState(false)

  async function persist(patch: Patch): Promise<boolean> {
    setPending(true)
    try {
      await updateProjectSettingsFn({
        data: { projectId: project.id, ...patch },
      })
      await router.invalidate()
      toast.success('Settings saved')
      return true
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save settings'))
      return false
    } finally {
      setPending(false)
    }
  }

  async function toggleAutoFormat(next: boolean) {
    setAutoFormat(next)
    if (!(await persist({ autoFormat: next }))) {
      setAutoFormat(!next)
    }
  }

  async function toggleStrip(next: boolean) {
    setStripMetadata(next)
    if (!(await persist({ stripMetadata: next }))) {
      setStripMetadata(!next)
    }
  }

  async function saveQuality() {
    const n = Math.min(
      100,
      Math.max(30, Math.round(Number(quality) || project.defaultQuality)),
    )
    setQuality(String(n))
    if (n !== project.defaultQuality) {
      await persist({ defaultQuality: n })
    }
  }

  const qualityChanged = Number(quality) !== project.defaultQuality

  return (
    <div className="divide-y">
      <Row
        description="Detect Accept and serve AVIF/WebP. Use with an Accept-aware CDN cache, or prefer explicit fmt values."
        label="Auto-format"
      >
        <Switch
          aria-label="Auto-format"
          checked={autoFormat}
          disabled={pending}
          onCheckedChange={toggleAutoFormat}
        />
      </Row>
      <Row
        description="Remove EXIF, GPS, and color profiles from output. Off keeps the original metadata."
        label="Strip metadata"
      >
        <Switch
          aria-label="Strip metadata"
          checked={stripMetadata}
          disabled={pending}
          onCheckedChange={toggleStrip}
        />
      </Row>
      <Row
        description="Quality (30–100) applied when a request omits ?q=. Higher = bigger files."
        label="Default quality"
      >
        <div className="flex items-center gap-2">
          <Input
            aria-label="Default quality"
            className="w-20 text-right font-mono tabular-nums"
            inputMode="numeric"
            max={100}
            min={30}
            onBlur={() => {
              const n = Number(quality)
              setQuality(
                quality === '' || Number.isNaN(n)
                  ? String(project.defaultQuality)
                  : String(Math.min(100, Math.max(30, Math.round(n)))),
              )
            }}
            onChange={(e) => {
              const raw = e.target.value
              const n = Number(raw)
              // Clamp the upper bound immediately so you can't type e.g. 5000.
              setQuality(
                raw === '' || Number.isNaN(n) ? raw : String(Math.min(100, n)),
              )
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveQuality()
              }
            }}
            type="number"
            value={quality}
          />
          <Button
            disabled={pending || !qualityChanged}
            onClick={saveQuality}
            size="sm"
            variant="outline"
          >
            Save
          </Button>
        </div>
      </Row>
    </div>
  )
}
