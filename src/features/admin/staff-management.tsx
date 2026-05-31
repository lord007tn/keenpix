import {
  ClipboardCopyIcon,
  MailIcon,
  RotateCwIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import {
  createInvitationFn,
  getAdminWorkspaceFn,
  revokeInvitationFn,
} from '@/functions/admin'

type StaffRole = 'admin' | 'staff'

interface StaffUser {
  createdAt: string
  email: string
  id: string
  name: string | null
  role: string
}

interface StaffInvitationRow {
  acceptedAt: string | null
  createdAt: string
  email: string
  expiresAt: string
  id: string
  role: StaffRole
  status: string
}

const invitationDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

function fmtDate(value: string) {
  return invitationDateFormatter.format(new Date(value))
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Invitation link copied')
}

export function StaffManagement() {
  const [users, setUsers] = useState<StaffUser[]>([])
  const [invitations, setInvitations] = useState<StaffInvitationRow[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('staff')
  const [sendEmail, setSendEmail] = useState(false)
  const [lastInviteLink, setLastInviteLink] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAdminWorkspaceFn()
      setUsers(data.users)
      setInvitations(data.invitations)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load staff settings'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function createInvite() {
    setPending(true)
    setLastInviteLink('')
    try {
      const invitation = await createInvitationFn({
        data: { email: email.trim(), role, sendEmail },
      })
      setEmail('')
      setRole('staff')
      setLastInviteLink(invitation.inviteLink)
      toast.success(
        sendEmail ? 'Invitation created and emailed' : 'Invitation created',
      )
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not create invitation'))
    } finally {
      setPending(false)
    }
  }

  async function revoke(id: string) {
    try {
      await revokeInvitationFn({ data: { id } })
      toast.success('Invitation revoked')
      await load()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not revoke invitation'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Super admins can invite staff with a copyable link. Email delivery is
        optional and uses the SMTP settings below.
      </CardDescription>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-email">Staff email</Label>
          <Input
            autoComplete="email"
            id="invite-email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            type="email"
            value={email}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Role</Label>
          <Select onValueChange={(v) => setRole(v as StaffRole)} value={role}>
            <SelectTrigger aria-label="Invitation role" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">staff</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          <div className="flex h-9 items-center gap-2 text-sm">
            <Switch
              aria-label="Email invitation"
              checked={sendEmail}
              disabled={pending}
              onCheckedChange={setSendEmail}
              size="sm"
            />
            Email link
          </div>
          <Button disabled={pending || !email.trim()} onClick={createInvite}>
            <UserPlusIcon data-icon="inline-start" />
            Invite
          </Button>
        </div>
      </div>

      {lastInviteLink ? (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/40 p-3">
          <span className="font-medium text-sm">Copy invitation link</span>
          <div className="flex gap-2">
            <Input
              className="font-mono text-xs"
              readOnly
              value={lastInviteLink}
            />
            <Button onClick={() => copy(lastInviteLink)} variant="outline">
              <ClipboardCopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Users</span>
            <Button disabled={loading} onClick={load} size="sm" variant="ghost">
              <RotateCwIcon data-icon="inline-start" />
              Refresh
            </Button>
          </div>
          <div className="divide-y rounded-md border">
            {users.map((user) => (
              <div className="flex items-center gap-3 p-3" key={user.id}>
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm">
                    {user.name || user.email}
                  </div>
                  <div className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </div>
                </div>
                <Badge
                  variant={user.role === 'super_admin' ? 'success' : 'outline'}
                >
                  {user.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium text-sm">Recent invitations</span>
          <div className="divide-y rounded-md border">
            {invitations.length === 0 ? (
              <p className="p-3 text-muted-foreground text-sm">
                No invitations yet.
              </p>
            ) : (
              invitations.map((invitation) => (
                <div
                  className="flex items-center gap-3 p-3"
                  key={invitation.id}
                >
                  <MailIcon className="size-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">
                      {invitation.email}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires {fmtDate(invitation.expiresAt)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      invitation.status === 'pending' ? 'warning' : 'outline'
                    }
                  >
                    {invitation.status}
                  </Badge>
                  {invitation.status === 'pending' ? (
                    <Button
                      aria-label={`Revoke invitation for ${invitation.email}`}
                      onClick={() => revoke(invitation.id)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <XIcon />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
