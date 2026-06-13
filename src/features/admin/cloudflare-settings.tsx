import { useForm } from '@tanstack/react-form'
import { InfoIcon, PlugZapIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getErrorMessage } from '@/errors/common'
import {
  getAdminWorkspaceFn,
  testCloudflareConnectionFn,
  updateCloudflareSettingsFn,
} from '@/functions/admin'
import { cloudflareSettingsSchema } from '@/schemas/admin'
import { getFieldError } from '@/utils/validation/form-errors'

interface CloudflareFormMeta {
  source: string
  tokenSet: boolean
}

interface CloudflareForm {
  apiToken: string
  enabled: boolean
  host: string
  zoneId: string
}

const EMPTY: CloudflareForm = {
  apiToken: '',
  enabled: false,
  host: '',
  zoneId: '',
}

const EMPTY_META: CloudflareFormMeta = {
  source: 'none',
  tokenSet: false,
}

export function CloudflareSettingsPanel() {
  const [meta, setMeta] = useState<CloudflareFormMeta>(EMPTY_META)
  const [testing, setTesting] = useState(false)
  const cloudflareForm = useForm({
    defaultValues: EMPTY,
    validators: {
      onChange: cloudflareSettingsSchema,
      onSubmit: cloudflareSettingsSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const saved = await updateCloudflareSettingsFn({ data: value })
        cloudflareForm.reset({
          ...value,
          apiToken: '',
        })
        setMeta({ source: saved.source, tokenSet: saved.tokenSet })
        toast.success('Cloudflare settings saved')
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not save Cloudflare settings'))
      }
    },
  })

  const load = useCallback(async () => {
    try {
      const data = await getAdminWorkspaceFn()
      cloudflareForm.reset({
        apiToken: '',
        enabled: data.cloudflare.enabled,
        host: data.cloudflare.host,
        zoneId: data.cloudflare.zoneId,
      })
      setMeta({
        source: data.cloudflare.source,
        tokenSet: data.cloudflare.tokenSet,
      })
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load Cloudflare settings'))
    }
  }, [cloudflareForm])

  useEffect(() => {
    load()
  }, [load])

  async function testConnection() {
    setTesting(true)
    try {
      await testCloudflareConnectionFn()
      toast.success('Cloudflare analytics reachable')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not reach Cloudflare'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        await cloudflareForm.handleSubmit()
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <CardDescription>
          Read Cloudflare edge cache analytics with a zone-scoped API token
          (Analytics → Read). The token is encrypted at rest. Env CLOUDFLARE_*
          values are used when database settings are not enabled.
        </CardDescription>
        <Badge variant={meta.source === 'environment' ? 'info' : 'outline'}>
          {meta.source}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <cloudflareForm.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <cloudflareForm.Field name="enabled">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label="Enable Cloudflare analytics"
                    checked={field.state.value}
                    disabled={isSubmitting}
                    onCheckedChange={field.handleChange}
                  />
                  <span className="text-sm">
                    Enable database Cloudflare settings
                  </span>
                </div>
              )}
            </cloudflareForm.Field>
          )}
        </cloudflareForm.Subscribe>
        <cloudflareForm.Field name="zoneId">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Zone ID</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="32-character hex zone id"
                  value={field.state.value}
                />
                {error ? (
                  <p
                    className="text-destructive text-xs"
                    id={`${field.name}-error`}
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </cloudflareForm.Field>
        <cloudflareForm.Field name="apiToken">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>
                  API token {meta.tokenSet ? '(saved)' : null}
                </Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  autoComplete="off"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={
                    meta.tokenSet
                      ? 'Leave blank to keep current'
                      : 'Cloudflare API token'
                  }
                  type="password"
                  value={field.state.value}
                />
                {error ? (
                  <p
                    className="text-destructive text-xs"
                    id={`${field.name}-error`}
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </cloudflareForm.Field>
        <cloudflareForm.Field name="host">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Label htmlFor={field.name}>Image hostname (optional)</Label>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="inline-flex cursor-help text-muted-foreground" />
                      }
                    >
                      <InfoIcon className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      A Cloudflare zone can serve several subdomains, and edge
                      analytics only filter by path (/img/*). Leave blank to
                      count the whole zone, or set this app's hostname (e.g.
                      keenpix.example.com) when the zone also hosts other sites
                      that use a /img path.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="images.example.com"
                  value={field.state.value}
                />
                {error ? (
                  <p
                    className="text-destructive text-xs"
                    id={`${field.name}-error`}
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            )
          }}
        </cloudflareForm.Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <cloudflareForm.Subscribe
          selector={(state) => [
            state.canSubmit,
            state.isSubmitting,
            state.isDirty,
          ]}
        >
          {([canSubmit, isSubmitting, isDirty]) => (
            <Button
              disabled={!canSubmit || isSubmitting || !isDirty}
              type="submit"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          )}
        </cloudflareForm.Subscribe>
        <Button
          disabled={testing}
          onClick={testConnection}
          type="button"
          variant="outline"
        >
          <PlugZapIcon data-icon="inline-start" />
          {testing ? 'Testing...' : 'Test connection'}
        </Button>
      </div>
    </form>
  )
}
