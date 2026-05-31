import { useForm } from '@tanstack/react-form'
import { SendIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import {
  getAdminWorkspaceFn,
  sendTestEmailFn,
  updateSmtpSettingsFn,
} from '@/functions/admin'
import { getFieldError } from '@/lib/form-errors'
import { sendTestEmailSchema, smtpSettingsSchema } from '@/schemas/admin'

interface SmtpFormMeta {
  passwordSet: boolean
  source: string
}

interface SmtpForm {
  enabled: boolean
  fromEmail: string
  fromName: string
  host: string
  password: string
  port: string
  secure: boolean
  username: string
}

const EMPTY: SmtpForm = {
  enabled: false,
  fromEmail: '',
  fromName: '',
  host: '',
  password: '',
  port: '587',
  secure: false,
  username: '',
}

const EMPTY_META: SmtpFormMeta = {
  passwordSet: false,
  source: 'none',
}

export function SmtpSettingsPanel() {
  const [meta, setMeta] = useState<SmtpFormMeta>(EMPTY_META)
  const smtpForm = useForm({
    defaultValues: EMPTY,
    validators: {
      onChange: smtpSettingsSchema,
      onSubmit: smtpSettingsSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const saved = await updateSmtpSettingsFn({ data: value })
        smtpForm.reset({
          ...value,
          password: '',
        })
        setMeta((current) => ({
          ...current,
          passwordSet: saved.passwordSet,
          source: saved.source,
        }))
        toast.success('SMTP settings saved')
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not save SMTP settings'))
      }
    },
  })

  const load = useCallback(async () => {
    try {
      const data = await getAdminWorkspaceFn()
      smtpForm.reset({
        enabled: data.smtp.enabled,
        fromEmail: data.smtp.fromEmail,
        fromName: data.smtp.fromName,
        host: data.smtp.host,
        password: '',
        port: String(data.smtp.port),
        secure: data.smtp.secure,
        username: data.smtp.username,
      })
      setMeta({
        passwordSet: data.smtp.passwordSet,
        source: data.smtp.source,
      })
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load SMTP settings'))
    }
  }, [smtpForm])

  useEffect(() => {
    load()
  }, [load])

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        await smtpForm.handleSubmit()
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <CardDescription>
          Configure the SMTP connection used when staff invitations are emailed.
          Env SMTP values are used when database settings are not enabled.
        </CardDescription>
        <Badge variant={meta.source === 'environment' ? 'info' : 'outline'}>
          {meta.source}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <smtpForm.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <>
              <smtpForm.Field name="enabled">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      aria-label="Enable SMTP"
                      checked={field.state.value}
                      disabled={isSubmitting}
                      onCheckedChange={field.handleChange}
                    />
                    <span className="text-sm">
                      Enable database SMTP settings
                    </span>
                  </div>
                )}
              </smtpForm.Field>
              <smtpForm.Field name="secure">
                {(field) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      aria-label="Use TLS"
                      checked={field.state.value}
                      disabled={isSubmitting}
                      onCheckedChange={field.handleChange}
                    />
                    <span className="text-sm">
                      Use TLS from connection start
                    </span>
                  </div>
                )}
              </smtpForm.Field>
            </>
          )}
        </smtpForm.Subscribe>
        <smtpForm.Field name="host">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>SMTP host</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="smtp.example.com"
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
        </smtpForm.Field>
        <smtpForm.Field name="port">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Port</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  inputMode="numeric"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  type="number"
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
        </smtpForm.Field>
        <smtpForm.Field name="username">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>Username</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  autoComplete="username"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
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
        </smtpForm.Field>
        <smtpForm.Field name="password">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>
                  Password {meta.passwordSet ? '(saved)' : null}
                </Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  autoComplete="new-password"
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={
                    meta.passwordSet ? 'Leave blank to keep current' : ''
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
        </smtpForm.Field>
        <smtpForm.Field name="fromEmail">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>From email</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="keenpix@example.com"
                  type="email"
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
        </smtpForm.Field>
        <smtpForm.Field name="fromName">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={field.name}>From name</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Keenpix"
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
        </smtpForm.Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <smtpForm.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              Save staff email settings
            </Button>
          )}
        </smtpForm.Subscribe>
      </div>
    </form>
  )
}

export function MailingPanel() {
  const [form, setForm] = useState<SmtpForm>(EMPTY)
  const [meta, setMeta] = useState<SmtpFormMeta>(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const testForm = useForm({
    defaultValues: {
      to: '',
    },
    validators: {
      onChange: sendTestEmailSchema,
      onSubmit: sendTestEmailSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = sendTestEmailSchema.parse(value)
      try {
        await sendTestEmailFn({ data: payload })
        testForm.reset()
        toast.success('Test email sent')
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not send test email'))
      }
    },
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminWorkspaceFn()
      setForm({
        enabled: data.smtp.enabled,
        fromEmail: data.smtp.fromEmail,
        fromName: data.smtp.fromName,
        host: data.smtp.host,
        password: '',
        port: String(data.smtp.port),
        secure: data.smtp.secure,
        username: data.smtp.username,
      })
      setMeta({
        passwordSet: data.smtp.passwordSet,
        source: data.smtp.source,
      })
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load mailing settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sender = form.fromName
    ? `${form.fromName} <${form.fromEmail || 'not configured'}>`
    : form.fromEmail || 'Not configured'
  const transport = form.host
    ? `${form.host}:${form.port}${form.secure ? ' TLS' : ''}`
    : 'Not configured'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.source === 'environment' ? 'info' : 'outline'}>
          {meta.source}
        </Badge>
        <Badge variant={form.enabled ? 'success' : 'outline'}>
          {form.enabled ? 'enabled' : 'disabled'}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-3">
          <div className="text-muted-foreground text-xs">Sender</div>
          <div className="mt-1 break-all font-medium text-sm">{sender}</div>
        </div>
        <div className="rounded-md border p-3">
          <div className="text-muted-foreground text-xs">Transport</div>
          <div className="mt-1 break-all font-medium text-sm">{transport}</div>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault()
          event.stopPropagation()
          await testForm.handleSubmit()
        }}
      >
        <testForm.Field name="to">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor={field.name}>Test recipient</Label>
                <Input
                  aria-describedby={error ? `${field.name}-error` : undefined}
                  aria-invalid={!!error}
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
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
        </testForm.Field>
        <testForm.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              disabled={loading || !canSubmit || isSubmitting}
              type="submit"
              variant="outline"
            >
              <SendIcon data-icon="inline-start" />
              Send test
            </Button>
          )}
        </testForm.Subscribe>
      </form>
    </div>
  )
}
