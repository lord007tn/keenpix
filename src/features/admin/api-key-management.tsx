import { useForm } from '@tanstack/react-form'
import {
  ClipboardCopyIcon,
  KeyRoundIcon,
  RotateCwIcon,
  ShieldCheckIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import {
  createApiKeyFn,
  disableApiKeyFn,
  getAdminWorkspaceFn,
} from '@/functions/admin'
import { getFieldError } from '@/lib/form-errors'
import { createApiKeySchema } from '@/schemas/api-keys'

interface ApiKeyRow {
  createdAt: Date | string
  enabled: boolean
  expiresAt: Date | string | null
  id: string
  lastRequest: Date | string | null
  name: string | null
  prefix: string | null
  start: string | null
}

const keyDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

function fmtDate(value: Date | string | null) {
  return value ? keyDateFormatter.format(new Date(value)) : 'Never'
}

async function copyKey(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('API key copied')
}

export function ApiKeyManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([])
  const [lastKey, setLastKey] = useState('')
  const [loading, setLoading] = useState(true)
  const keyForm = useForm({
    defaultValues: { name: '' },
    validators: {
      onChange: createApiKeySchema,
      onSubmit: createApiKeySchema,
    },
    onSubmit: async ({ value }) => {
      setLastKey('')
      try {
        const created = await createApiKeyFn({ data: value })
        keyForm.reset()
        setLastKey(created.key)
        toast.success('API key created')
        await load()
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not create API key'))
      }
    },
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminWorkspaceFn()
      setApiKeys(data.apiKeys)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load API keys'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function disable(id: string) {
    try {
      await disableApiKeyFn({ data: { id } })
      toast.success('API key disabled')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not disable API key'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Create keys for trusted internal systems that need to manage Keenpix
        projects, domains, and pipeline settings over the JSON API.
      </CardDescription>

      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          keyForm.handleSubmit()
        }}
      >
        <keyForm.Field name="name">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={field.name}>Key name</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="JoodCMS integration"
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
        </keyForm.Field>
        <keyForm.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              <KeyRoundIcon data-icon="inline-start" />
              Create key
            </Button>
          )}
        </keyForm.Subscribe>
      </form>

      {lastKey ? (
        <Alert>
          <ShieldCheckIcon />
          <AlertTitle>Copy this key now</AlertTitle>
          <AlertDescription>
            It is shown once. Store it in the calling system as a secret.
          </AlertDescription>
          <div className="col-start-2 mt-3 flex gap-2">
            <Input className="font-mono text-xs" readOnly value={lastKey} />
            <Button onClick={() => copyKey(lastKey)} variant="outline">
              <ClipboardCopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">API keys</span>
        <Button disabled={loading} onClick={load} size="sm" variant="ghost">
          <RotateCwIcon data-icon="inline-start" />
          Refresh
        </Button>
      </div>

      <div className="divide-y rounded-md border">
        {apiKeys.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          apiKeys.map((apiKey) => {
            const start = [apiKey.prefix, apiKey.start].filter(Boolean).join('')
            return (
              <div className="flex items-center gap-3 p-3" key={apiKey.id}>
                <KeyRoundIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm">
                    {apiKey.name ?? 'Unnamed key'}
                  </div>
                  <div className="truncate font-mono text-muted-foreground text-xs">
                    {start ? `${start}...` : apiKey.id}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Last used {fmtDate(apiKey.lastRequest)}
                  </div>
                </div>
                <Badge variant={apiKey.enabled ? 'success' : 'outline'}>
                  {apiKey.enabled ? 'active' : 'disabled'}
                </Badge>
                {apiKey.enabled ? (
                  <Button
                    aria-label={`Disable API key ${apiKey.name ?? apiKey.id}`}
                    onClick={() => disable(apiKey.id)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
