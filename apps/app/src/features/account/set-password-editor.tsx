import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

export function SetPasswordEditor() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const valid = password.length >= 8 && password === confirm && !pending

  return (
    <form
      className="flex max-w-md flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!valid) {
          return
        }
        setPending(true)
        try {
          const { error } = await authClient.$fetch('/set-password', {
            method: 'POST',
            body: { newPassword: password },
          })
          if (error) {
            toast.error(getErrorMessage(error, 'Could not set password'))
            return
          }
          toast.success('Password added')
          window.location.reload()
        } catch (error) {
          toast.error(getErrorMessage(error, 'Could not set password'))
        } finally {
          setPending(false)
        }
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="set-password">New password</Label>
        <Input
          autoComplete="new-password"
          id="set-password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-set-password">Confirm password</Label>
        <Input
          aria-invalid={confirm.length > 0 && password !== confirm}
          autoComplete="new-password"
          id="confirm-set-password"
          onChange={(event) => setConfirm(event.target.value)}
          type="password"
          value={confirm}
        />
      </div>
      <Button className="w-fit" disabled={!valid} type="submit">
        {pending ? 'Adding password…' : 'Add password'}
      </Button>
    </form>
  )
}
