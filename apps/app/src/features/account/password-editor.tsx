import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

const MIN_LENGTH = 8

// In-app password rotation for a signed-in user. Re-auth with the current
// password is enforced server-side by better-auth; we also require a matching
// confirmation and (by default) sign out other devices so a rotation after a
// suspected compromise actually kicks attacker sessions.
export function PasswordEditor() {
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [revokeOthers, setRevokeOthers] = useState(true)
  const [pending, setPending] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== next
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    confirm === next &&
    !pending

  async function save() {
    if (!canSubmit) {
      return
    }
    setPending(true)
    try {
      const { error } = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: revokeOthers,
      })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not update password'))
        return
      }
      setCurrent('')
      setNext('')
      setConfirm('')
      await router.invalidate()
      toast.success(
        revokeOthers
          ? 'Password updated — other devices signed out'
          : 'Password updated',
      )
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update password'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      className="flex max-w-sm flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <Input
          autoComplete="current-password"
          id="current-password"
          onChange={(e) => setCurrent(e.target.value)}
          type="password"
          value={current}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          aria-describedby="new-password-hint"
          aria-invalid={tooShort}
          autoComplete="new-password"
          id="new-password"
          onChange={(e) => setNext(e.target.value)}
          type="password"
          value={next}
        />
        <p
          className={
            tooShort
              ? 'text-destructive text-xs'
              : 'text-muted-foreground text-xs'
          }
          id="new-password-hint"
        >
          At least {MIN_LENGTH} characters.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          aria-describedby={mismatch ? 'confirm-password-error' : undefined}
          aria-invalid={mismatch}
          autoComplete="new-password"
          id="confirm-password"
          onChange={(e) => setConfirm(e.target.value)}
          type="password"
          value={confirm}
        />
        {mismatch ? (
          <p className="text-destructive text-xs" id="confirm-password-error">
            Passwords don’t match.
          </p>
        ) : null}
      </div>
      <label
        className="flex items-center gap-2 text-sm"
        htmlFor="revoke-others"
      >
        <Switch
          checked={revokeOthers}
          id="revoke-others"
          onCheckedChange={setRevokeOthers}
        />
        Sign out of all other devices
      </label>
      <Button
        className="self-start"
        disabled={!canSubmit}
        size="sm"
        type="submit"
      >
        Update password
      </Button>
    </form>
  )
}
