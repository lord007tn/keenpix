import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

// Permanent account deletion uses a typed-email guard followed by a verification
// link sent to the account address. This works for password and OAuth-only users.
export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [pending, setPending] = useState(false)

  const canSubmit =
    confirmEmail.trim().toLowerCase() === email.toLowerCase() && !pending

  async function remove() {
    if (!canSubmit) {
      return
    }
    setPending(true)
    try {
      const { error } = await authClient.deleteUser({ callbackURL: '/login' })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not delete your account'))
        return
      }
      toast.success('Check your email to confirm account deletion')
      setOpen(false)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not delete your account'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={<Button variant="destructive">Delete account</Button>}
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This permanently deletes your account and any workspace you solely
            own, including its projects and analytics. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            remove()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-email">
              Type <span className="font-mono">{email}</span> to confirm
            </Label>
            <Input
              autoComplete="off"
              id="confirm-email"
              onChange={(e) => setConfirmEmail(e.target.value)}
              value={confirmEmail}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={!canSubmit} type="submit" variant="destructive">
              Send confirmation email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
