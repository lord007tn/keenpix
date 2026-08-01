import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  CrownIcon,
  MailIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersRoundIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'
import { getFieldError } from '@/utils/validation/form-errors'

// Org-member roles the UI offers on invite / role-change. `owner` is deliberately
// excluded from the dropdowns — ownership transfer is a guarded, confirmed action.
const ORG_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

interface MemberTarget {
  id: string
  label: string
}

function roleLabel(role: string | null | undefined) {
  return (role && ORG_ROLE_LABELS[role]) || role || 'Member'
}

function isAssignableRole(value: unknown): value is 'member' | 'admin' {
  return value === 'member' || value === 'admin'
}

const inviteSchema = z.object({
  email: z.email('Enter a valid email address.'),
  role: z.enum(['member', 'admin']),
})

export function TeamManagement() {
  const membersQuery = useQuery({
    queryKey: ['org-full'],
    queryFn: async () => {
      const { data, error } =
        await authClient.organization.getFullOrganization()
      if (error) {
        throw new Error(error.message ?? 'Could not load your team')
      }
      return data
    },
  })
  const activeMemberQuery = useQuery({
    queryKey: ['org-active-member'],
    queryFn: async () => {
      const { data } = await authClient.organization.getActiveMember()
      return data
    },
  })

  const [confirmRemove, setConfirmRemove] = useState<MemberTarget | null>(null)
  const [confirmTransfer, setConfirmTransfer] = useState<MemberTarget | null>(
    null,
  )
  const [busy, setBusy] = useState(false)

  const members = membersQuery.data?.members ?? []
  const invitations = (membersQuery.data?.invitations ?? []).filter(
    (invitation) => invitation.status === 'pending',
  )
  const orgName = membersQuery.data?.name ?? ''
  const myRole = activeMemberQuery.data?.role ?? null
  const myMemberId = activeMemberQuery.data?.id
  const isOwner = myRole === 'owner'
  const canManage = isOwner || myRole === 'admin'

  const inviteForm = useForm({
    defaultValues: { email: '', role: 'member' as 'member' | 'admin' },
    validators: { onChange: inviteSchema, onSubmit: inviteSchema },
    onSubmit: async ({ value }) => {
      const payload = inviteSchema.parse(value)
      const { error } = await authClient.organization.inviteMember({
        email: payload.email,
        role: payload.role,
      })
      if (error) {
        toast.error(error.message ?? 'Could not send invitation')
        return
      }
      inviteForm.reset()
      toast.success(`Invitation sent to ${payload.email}`)
      membersQuery.refetch()
    },
  })

  async function changeRole(memberId: string, role: 'member' | 'admin') {
    const { error } = await authClient.organization.updateMemberRole({
      memberId,
      role,
    })
    if (error) {
      toast.error(getErrorMessage(error, 'Could not update role'))
      return
    }
    toast.success('Role updated')
    membersQuery.refetch()
  }

  async function removeMember(target: MemberTarget) {
    setBusy(true)
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: target.id,
    })
    setBusy(false)
    if (error) {
      toast.error(getErrorMessage(error, 'Could not remove member'))
      return
    }
    setConfirmRemove(null)
    toast.success(`Removed ${target.label}`)
    membersQuery.refetch()
  }

  // Ownership transfer: promote the target to owner, then step down to admin.
  // Two owners exist between the calls, so stepping down is allowed (better-auth
  // only blocks leaving the org without ANY owner).
  async function transferOwnership(target: MemberTarget) {
    setBusy(true)
    try {
      const promote = await authClient.organization.updateMemberRole({
        memberId: target.id,
        role: 'owner',
      })
      if (promote.error) {
        toast.error(getErrorMessage(promote.error, 'Could not transfer'))
        return
      }
      // The target is now an owner. If stepping ourselves down fails, the org
      // has two owners — report that honestly rather than a clean success.
      let demoteFailed = false
      if (myMemberId) {
        const demote = await authClient.organization.updateMemberRole({
          memberId: myMemberId,
          role: 'admin',
        })
        demoteFailed = Boolean(demote.error)
      }
      setConfirmTransfer(null)
      if (demoteFailed) {
        toast.warning(
          `${target.label} is now an owner, but we couldn't step you down — you're still an owner too.`,
        )
      } else {
        toast.success(`Ownership transferred to ${target.label}`)
      }
      await Promise.all([membersQuery.refetch(), activeMemberQuery.refetch()])
    } finally {
      setBusy(false)
    }
  }

  async function cancelInvitation(invitationId: string, email: string) {
    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    })
    if (error) {
      toast.error(getErrorMessage(error, 'Could not cancel invitation'))
      return
    }
    toast.success(`Cancelled invitation for ${email}`)
    membersQuery.refetch()
  }

  const orgForm = useForm({
    defaultValues: { name: orgName },
    onSubmit: async ({ value }) => {
      const name = value.name.trim()
      if (!name) {
        toast.error('Enter an organization name.')
        return
      }
      const { error } = await authClient.organization.update({
        data: { name },
      })
      if (error) {
        toast.error(getErrorMessage(error, 'Could not rename organization'))
        return
      }
      toast.success('Organization renamed')
      membersQuery.refetch()
    },
  })

  // orgName loads async, so useForm's initial defaultValues capture the empty
  // string and the rename field renders blank. Seed it once the name arrives,
  // but never clobber an in-progress edit.
  useEffect(() => {
    if (orgName && !orgForm.state.isDirty) {
      orgForm.setFieldValue('name', orgName)
    }
  }, [orgName, orgForm])

  function renderMembers() {
    if (membersQuery.isPending) {
      return <p className="p-3 text-muted-foreground text-sm">Loading…</p>
    }
    if (membersQuery.isError) {
      return (
        <div className="flex flex-col items-start gap-2 p-3">
          <p className="text-destructive text-sm">Couldn’t load your team.</p>
          <Button
            onClick={() => membersQuery.refetch()}
            size="sm"
            variant="outline"
          >
            Try again
          </Button>
        </div>
      )
    }
    if (members.length === 0) {
      return (
        <p className="p-3 text-muted-foreground text-sm">No members yet.</p>
      )
    }
    return members.map((member) => {
      const memberIsOwner = member.role === 'owner'
      const isSelf = member.id === myMemberId
      const manageable = canManage && !memberIsOwner && !isSelf
      const label = member.user?.email ?? 'member'
      return (
        <div className="flex items-center gap-3 p-3" key={member.id}>
          <UsersRoundIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-sm">
              {member.user?.name || member.user?.email}
            </div>
            <div className="truncate text-muted-foreground text-xs">
              {member.user?.email}
            </div>
          </div>
          {manageable ? (
            <Select
              onValueChange={(v) => {
                if (isAssignableRole(v)) {
                  changeRole(member.id, v)
                }
              }}
              value={member.role}
            >
              <SelectTrigger
                aria-label={`Role for ${label}`}
                className="w-28"
                disabled={busy}
              >
                <SelectValue>{(value) => roleLabel(String(value))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">{ORG_ROLE_LABELS.member}</SelectItem>
                <SelectItem value="admin">{ORG_ROLE_LABELS.admin}</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant={memberIsOwner ? 'success' : 'outline'}>
              {roleLabel(member.role)}
            </Badge>
          )}
          {manageable ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label={`Actions for ${label}`}
                    size="icon-sm"
                    variant="ghost"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwner ? (
                  <DropdownMenuItem
                    onClick={() => setConfirmTransfer({ id: member.id, label })}
                  >
                    <CrownIcon />
                    Transfer ownership
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setConfirmRemove({ id: member.id, label })}
                  variant="destructive"
                >
                  <Trash2Icon />
                  Remove member
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Invite teammates to this organization and manage their roles. Owners and
        admins can invite and manage members; members have read access.
      </CardDescription>

      {canManage ? (
        <form
          className="flex flex-col gap-1.5 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            orgForm.handleSubmit()
          }}
        >
          <orgForm.Field name="name">
            {(field) => (
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
              </div>
            )}
          </orgForm.Field>
          <orgForm.Subscribe
            selector={(state) => [state.isSubmitting, state.isDirty]}
          >
            {([isSubmitting, isDirty]) => (
              <Button
                disabled={isSubmitting || !isDirty}
                type="submit"
                variant="outline"
              >
                {isSubmitting ? 'Saving…' : 'Rename'}
              </Button>
            )}
          </orgForm.Subscribe>
        </form>
      ) : null}

      {canManage ? (
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-start"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            inviteForm.handleSubmit()
          }}
        >
          <inviteForm.Field name="email">
            {(field) => {
              const error = getFieldError(field.state.meta)
              return (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Teammate email</Label>
                  <Input
                    aria-describedby={error ? `${field.name}-error` : undefined}
                    aria-invalid={!!error}
                    autoComplete="email"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="teammate@example.com"
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
          </inviteForm.Field>
          <inviteForm.Field name="role">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label>Role</Label>
                <Select
                  onValueChange={(v) => {
                    if (isAssignableRole(v)) {
                      field.handleChange(v)
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger aria-label="Invitation role" className="w-36">
                    <SelectValue>
                      {(value) =>
                        isAssignableRole(value) ? roleLabel(value) : 'Member'
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      {ORG_ROLE_LABELS.member}
                    </SelectItem>
                    <SelectItem value="admin">
                      {ORG_ROLE_LABELS.admin}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </inviteForm.Field>
          <inviteForm.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <div className="flex justify-end md:col-start-3 md:pt-1">
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  <UserPlusIcon data-icon="inline-start" />
                  Invite
                </Button>
              </div>
            )}
          </inviteForm.Subscribe>
        </form>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-h-9 items-center justify-between">
            <span className="font-medium text-sm">Members</span>
            <Badge variant="outline">{members.length}</Badge>
          </div>
          <div className="divide-y rounded-md border">{renderMembers()}</div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-h-9 items-center justify-between">
            <span className="font-medium text-sm">Pending invitations</span>
            <Badge variant="outline">{invitations.length}</Badge>
          </div>
          <div className="divide-y rounded-md border">
            {invitations.length === 0 ? (
              <p className="p-3 text-muted-foreground text-sm">
                No pending invitations.
              </p>
            ) : (
              invitations.map((invitation) => (
                <div
                  className="flex items-center gap-3 p-3"
                  key={invitation.id}
                >
                  <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">
                      {invitation.email}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {roleLabel(invitation.role)} · expires{' '}
                      {dayjs(invitation.expiresAt).format('MMM DD, YYYY')}
                    </div>
                  </div>
                  {canManage ? (
                    <Button
                      aria-label={`Cancel invitation for ${invitation.email}`}
                      onClick={() =>
                        cancelInvitation(invitation.id, invitation.email)
                      }
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

      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            setConfirmRemove(null)
          }
        }}
        open={confirmRemove !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove teammate?</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{confirmRemove?.label}</span> will
              immediately lose access to this organization. You can re-invite
              them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmRemove(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirmRemove) {
                  removeMember(confirmRemove)
                }
              }}
              variant="destructive"
            >
              {busy ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(next) => {
          if (!next) {
            setConfirmTransfer(null)
          }
        }}
        open={confirmTransfer !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer ownership?</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{confirmTransfer?.label}</span> will
              become the owner of {orgName || 'this organization'} and you will
              be demoted to admin. Only the owner can transfer ownership again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmTransfer(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirmTransfer) {
                  transferOwnership(confirmTransfer)
                }
              }}
            >
              {busy ? 'Transferring…' : 'Transfer ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
