import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { MailIcon, UserPlusIcon, UsersRoundIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'
import { getFieldError } from '@/utils/validation/form-errors'

// Org-member roles the UI offers on invite / role-change. `owner` is deliberately
// excluded — ownership transfer is not a casual dropdown action.
const ORG_ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
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

  const members = membersQuery.data?.members ?? []
  const invitations = (membersQuery.data?.invitations ?? []).filter(
    (invitation) => invitation.status === 'pending',
  )
  const myRole = activeMemberQuery.data?.role ?? null
  const myMemberId = activeMemberQuery.data?.id
  const canManage = myRole === 'owner' || myRole === 'admin'

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

  async function removeMember(memberId: string, label: string) {
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
    })
    if (error) {
      toast.error(getErrorMessage(error, 'Could not remove member'))
      return
    }
    toast.success(`Removed ${label}`)
    membersQuery.refetch()
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

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Invite teammates to this organization and manage their roles. Owners and
        admins can invite and manage members; members have read access.
      </CardDescription>

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
          <div className="divide-y rounded-md border">
            {members.length === 0 ? (
              <p className="p-3 text-muted-foreground text-sm">
                {membersQuery.isPending ? 'Loading…' : 'No members yet.'}
              </p>
            ) : (
              members.map((member) => {
                const isOwner = member.role === 'owner'
                const isSelf = member.id === myMemberId
                const manageable = canManage && !isOwner && !isSelf
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
                          aria-label={`Role for ${member.user?.email}`}
                          className="w-28"
                        >
                          <SelectValue>
                            {(value) => roleLabel(String(value))}
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
                    ) : (
                      <Badge variant={isOwner ? 'success' : 'outline'}>
                        {roleLabel(member.role)}
                      </Badge>
                    )}
                    {manageable ? (
                      <Button
                        aria-label={`Remove ${member.user?.email}`}
                        onClick={() =>
                          removeMember(
                            member.id,
                            member.user?.email ?? 'member',
                          )
                        }
                        size="icon-sm"
                        variant="ghost"
                      >
                        <XIcon />
                      </Button>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
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
    </div>
  )
}
