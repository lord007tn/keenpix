import { useRouter } from '@tanstack/react-router'
import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

// Rough email shape check — the server is the source of truth; this only gates
// the button so we don't fire an obviously-bad request.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Manages the login email: shows verification state (cloud), offers a resend
// when unverified, and lets the user request a change. On cloud, better-auth
// emails a confirmation link to the CURRENT address before the change lands.
export function EmailEditor({
  cloud,
  email,
  verified,
}: {
  cloud: boolean
  email: string
  verified: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [resending, setResending] = useState(false)

  const canSubmit =
    EMAIL_RE.test(newEmail) &&
    newEmail.toLowerCase() !== email.toLowerCase() &&
    !pending

  async function resendVerification() {
    setResending(true)
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: '/app/account',
      })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not send the email'))
        return
      }
      toast.success('Verification email sent — check your inbox')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not send the email'))
    } finally {
      setResending(false)
    }
  }

  async function changeEmail() {
    if (!canSubmit) {
      return
    }
    setPending(true)
    try {
      const { error } = await authClient.changeEmail({
        newEmail: newEmail.trim(),
        callbackURL: '/app/account',
      })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not change email'))
        return
      }
      setEditing(false)
      setNewEmail('')
      await router.invalidate()
      toast.success(
        verified
          ? 'Check your current inbox to confirm the change'
          : 'Email updated',
      )
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not change email'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-3 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <code className="break-all font-mono text-muted-foreground text-xs">
          {email}
        </code>
        {cloud ? (
          <Badge variant={verified ? 'outline' : 'destructive'}>
            {verified ? (
              <CheckCircle2Icon data-icon="inline-start" />
            ) : (
              <TriangleAlertIcon data-icon="inline-start" />
            )}
            {verified ? 'Verified' : 'Unverified'}
          </Badge>
        ) : null}
      </div>

      {cloud && !verified ? (
        <Button
          disabled={resending}
          onClick={resendVerification}
          size="sm"
          variant="outline"
        >
          Resend verification email
        </Button>
      ) : null}

      {editing ? (
        <form
          className="flex w-full flex-col gap-2 sm:w-64"
          onSubmit={(e) => {
            e.preventDefault()
            changeEmail()
          }}
        >
          <Label className="sr-only" htmlFor="new-email">
            New email
          </Label>
          <Input
            autoComplete="email"
            id="new-email"
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@email.com"
            type="email"
            value={newEmail}
          />
          <div className="flex gap-2">
            <Button disabled={!canSubmit} size="sm" type="submit">
              {verified ? 'Send confirmation' : 'Update email'}
            </Button>
            <Button
              onClick={() => {
                setEditing(false)
                setNewEmail('')
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setEditing(true)} size="sm" variant="outline">
          Change email
        </Button>
      )}
    </div>
  )
}
