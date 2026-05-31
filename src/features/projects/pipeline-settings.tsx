import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import { updateProjectSettingsFn } from '@/functions/projects'
import { getFieldError } from '@/lib/form-errors'
import { projectQualitySchema } from '@/schemas/projects'
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
  const [pending, setPending] = useState(false)
  const qualityForm = useForm({
    defaultValues: {
      defaultQuality: String(project.defaultQuality),
    },
    validators: {
      onChange: projectQualitySchema,
      onSubmit: projectQualitySchema,
    },
    onSubmit: async ({ value }) => {
      const { defaultQuality } = projectQualitySchema.parse(value)
      const quality = Number(defaultQuality)
      if (quality !== project.defaultQuality) {
        await persist({ defaultQuality: quality })
      }
    },
  })

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
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            qualityForm.handleSubmit()
          }}
        >
          <qualityForm.Field name="defaultQuality">
            {(field) => {
              const error = getFieldError(field.state.meta)
              return (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      aria-describedby={
                        error ? `${field.name}-error` : undefined
                      }
                      aria-invalid={!!error}
                      aria-label="Default quality"
                      className="w-20 text-right font-mono tabular-nums"
                      inputMode="numeric"
                      max={100}
                      min={30}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="number"
                      value={field.state.value}
                    />
                    <qualityForm.Subscribe
                      selector={(state) => ({
                        canSubmit: state.canSubmit,
                        isSubmitting: state.isSubmitting,
                        quality: state.values.defaultQuality,
                      })}
                    >
                      {({ canSubmit, isSubmitting, quality }) => (
                        <Button
                          disabled={
                            pending ||
                            !canSubmit ||
                            isSubmitting ||
                            Number(quality) === project.defaultQuality
                          }
                          size="sm"
                          type="submit"
                          variant="outline"
                        >
                          Save
                        </Button>
                      )}
                    </qualityForm.Subscribe>
                  </div>
                  {error ? (
                    <p
                      className="text-destructive text-xs"
                      id={`${field.name}-error`}
                    >
                      {error}
                    </p>
                  ) : null}
                </>
              )
            }}
          </qualityForm.Field>
        </form>
      </Row>
    </div>
  )
}
