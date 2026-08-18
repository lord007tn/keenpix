import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

export function NameEditor({ initial }: { initial: string }) {
  const router = useRouter()
  const [name, setName] = useState(initial)
  const [pending, setPending] = useState(false)
  const changed = name.trim().length > 0 && name.trim() !== initial.trim()

  async function save() {
    setPending(true)
    try {
      // better-auth client methods resolve with { error } instead of throwing, so
      // a try/catch alone would report a failed update as success.
      const { error } = await authClient.updateUser({ name: name.trim() })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not update name'))
        return
      }
      await router.invalidate()
      toast.success('Name updated')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update name'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label="Display name"
        className="w-48"
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        value={name}
      />
      <Button
        disabled={pending || !changed}
        onClick={save}
        size="sm"
        variant="outline"
      >
        Save
      </Button>
    </div>
  )
}
