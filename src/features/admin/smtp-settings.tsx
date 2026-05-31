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

interface SmtpForm {
  enabled: boolean
  fromEmail: string
  fromName: string
  host: string
  password: string
  passwordSet: boolean
  port: string
  secure: boolean
  source: string
  username: string
}

const EMPTY: SmtpForm = {
  enabled: false,
  fromEmail: '',
  fromName: '',
  host: '',
  password: '',
  passwordSet: false,
  port: '587',
  secure: false,
  source: 'none',
  username: '',
}

export function SmtpSettingsPanel() {
  const [form, setForm] = useState<SmtpForm>(EMPTY)
  const [testRecipient, setTestRecipient] = useState('')
  const [pending, setPending] = useState(false)
  const [testing, setTesting] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getAdminWorkspaceFn()
      setForm({
        enabled: data.smtp.enabled,
        fromEmail: data.smtp.fromEmail,
        fromName: data.smtp.fromName,
        host: data.smtp.host,
        password: '',
        passwordSet: data.smtp.passwordSet,
        port: String(data.smtp.port),
        secure: data.smtp.secure,
        source: data.smtp.source,
        username: data.smtp.username,
      })
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load SMTP settings'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function update<K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setPending(true)
    try {
      const saved = await updateSmtpSettingsFn({
        data: {
          enabled: form.enabled,
          host: form.host.trim(),
          port: Number(form.port) || 587,
          secure: form.secure,
          username: form.username.trim(),
          password: form.password || undefined,
          fromEmail: form.fromEmail.trim(),
          fromName: form.fromName.trim(),
        },
      })
      setForm((current) => ({
        ...current,
        password: '',
        passwordSet: saved.passwordSet,
        source: saved.source,
      }))
      toast.success('SMTP settings saved')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not save SMTP settings'))
    } finally {
      setPending(false)
    }
  }

  async function sendTest() {
    setTesting(true)
    try {
      await sendTestEmailFn({ data: { to: testRecipient.trim() } })
      toast.success('Test email sent')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not send test email'))
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <CardDescription>
          Configure SMTP for test emails and optional invitation delivery. Env
          SMTP values are used when database settings are not enabled.
        </CardDescription>
        <Badge variant={form.source === 'environment' ? 'info' : 'outline'}>
          {form.source}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Switch
            aria-label="Enable SMTP"
            checked={form.enabled}
            disabled={pending}
            onCheckedChange={(v) => update('enabled', v)}
          />
          <span className="text-sm">Enable database SMTP settings</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            aria-label="Use TLS"
            checked={form.secure}
            disabled={pending}
            onCheckedChange={(v) => update('secure', v)}
          />
          <span className="text-sm">Use TLS from connection start</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-host">SMTP host</Label>
          <Input
            id="smtp-host"
            onChange={(e) => update('host', e.target.value)}
            placeholder="smtp.example.com"
            value={form.host}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-port">Port</Label>
          <Input
            id="smtp-port"
            inputMode="numeric"
            onChange={(e) => update('port', e.target.value)}
            type="number"
            value={form.port}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-user">Username</Label>
          <Input
            autoComplete="username"
            id="smtp-user"
            onChange={(e) => update('username', e.target.value)}
            value={form.username}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-password">
            Password {form.passwordSet ? '(saved)' : null}
          </Label>
          <Input
            autoComplete="new-password"
            id="smtp-password"
            onChange={(e) => update('password', e.target.value)}
            placeholder={form.passwordSet ? 'Leave blank to keep current' : ''}
            type="password"
            value={form.password}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-from-email">From email</Label>
          <Input
            id="smtp-from-email"
            onChange={(e) => update('fromEmail', e.target.value)}
            placeholder="keenpix@example.com"
            type="email"
            value={form.fromEmail}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="smtp-from-name">From name</Label>
          <Input
            id="smtp-from-name"
            onChange={(e) => update('fromName', e.target.value)}
            placeholder="Keenpix"
            value={form.fromName}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={save}>
          Save email settings
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="test-recipient">Test recipient</Label>
          <Input
            id="test-recipient"
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="you@example.com"
            type="email"
            value={testRecipient}
          />
        </div>
        <Button
          disabled={testing || !testRecipient.trim()}
          onClick={sendTest}
          variant="outline"
        >
          <SendIcon data-icon="inline-start" />
          Send test
        </Button>
      </div>
    </div>
  )
}
