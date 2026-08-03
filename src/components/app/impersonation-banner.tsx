import { UserCogIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/errors/common'
import type { SessionUser } from '@/functions/auth'
import { authClient } from '@/lib/auth/client'

// Shown in both the tenant and operator shells while a super-admin is
// impersonating a customer (better-auth admin plugin sets session.impersonatedBy).
// Every action in this session runs AS the customer, so the exit path is always
// one click away.
export function ImpersonationBanner({ user }: { user: SessionUser }) {
  const [pending, setPending] = useState(false)

  if (!user.impersonatedBy) {
    return null
  }

  async function stop() {
    setPending(true)
    try {
      // better-auth's client returns { data, error } rather than throwing.
      const result = await authClient.admin.stopImpersonating()
      if (result.error) {
        throw new Error(result.error.message ?? 'Could not stop impersonating')
      }
      // Full reload so the restored operator session is picked up everywhere.
      window.location.assign('/admin/customers')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not stop impersonating'))
      setPending(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-warning/30 border-b bg-warning/10 px-4 py-2 text-sm text-warning-text">
      <UserCogIcon className="size-4 shrink-0" />
      <span className="min-w-0">
        You are impersonating{' '}
        <span className="font-medium">“{user.name || user.email}”</span>.
        Actions run as this customer.
      </span>
      <Button
        className="ml-auto"
        disabled={pending}
        onClick={stop}
        size="sm"
        variant="outline"
      >
        {pending ? 'Exiting…' : 'Stop impersonating'}
      </Button>
    </div>
  )
}
