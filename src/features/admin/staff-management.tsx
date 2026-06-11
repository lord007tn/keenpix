import { useForm } from '@tanstack/react-form'
import dayjs from 'dayjs'
import {
  ClipboardCopyIcon,
  MailIcon,
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
import {
  type CreateInvitationInput,
  createInvitationSchema,
} from '@/schemas/admin'
import { getFieldError } from '@/utils/validation/form-errors'

function isStaffRole(value: unknown): value is CreateInvitationInput['role'] {
  return value === 'admin' || value === 'staff'
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  staff: 'Staff',
}

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role
}

const DEFAULT_INVITE_VALUES: CreateInvitationInput = {
  email: '',
  role: 'staff',
  sendEmail: false,
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Invitation link copied')
}

export function StaffManagement() {
  const [workspace, setWorkspace] = useState<Awaited<
    ReturnType<typeof getAdminWorkspaceFn>
  > | null>(null)
  const [lastInviteLink, setLastInviteLink] = useState('')
  const users = workspace?.users ?? []
  const invitations = workspace?.invitations ?? []
  const inviteForm = useForm({
    defaultValues: DEFAULT_INVITE_VALUES,
    validators: {
      onChange: createInvitationSchema,
      onSubmit: createInvitationSchema,
    },
    onSubmit: async ({ value }) => {
      setLastInviteLink('')
      const payload = createInvitationSchema.parse(value)
      try {
        const invitation = await createInvitationFn({ data: payload })
        inviteForm.reset()
        setLastInviteLink(invitation.inviteLink)
        setWorkspace((current) =>
          current
            ? {
                ...current,
                invitations: [
                  {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    status: invitation.status,
                    expiresAt: invitation.expiresAt,
                    acceptedAt: invitation.acceptedAt,
                    createdAt: invitation.createdAt,
                  },
                  ...current.invitations,
                ],
              }
            : current,
        )
        toast.success(
          payload.sendEmail
            ? 'Invitation created and emailed'
            : 'Invitation created',
        )
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not create invitation'))
      }
    },
  })

  const load = useCallback(async () => {
    try {
      const data = await getAdminWorkspaceFn()
      setWorkspace(data)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load staff settings'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function revoke(id: string) {
    const previous = workspace
    setWorkspace((current) =>
      current
        ? {
            ...current,
            invitations: current.invitations.map((invitation) =>
              invitation.id === id
                ? { ...invitation, status: 'revoked' }
                : invitation,
            ),
          }
        : current,
    )
    try {
      await revokeInvitationFn({ data: { id } })
      toast.success('Invitation revoked')
    } catch (e) {
      setWorkspace(previous)
      toast.error(getErrorMessage(e, 'Could not revoke invitation'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Super admins can invite staff with a copyable link. Email delivery is
        optional and uses the staff SMTP settings in the Email tab.
      </CardDescription>

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
                <Label htmlFor={field.name}>Staff email</Label>
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
                  if (isStaffRole(v)) {
                    field.handleChange(v)
                  }
                }}
                value={field.state.value}
              >
                <SelectTrigger aria-label="Invitation role" className="w-36">
                  <SelectValue>
                    {(value) =>
                      isStaffRole(value) ? roleLabel(value) : 'Select role'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </inviteForm.Field>
        <inviteForm.Field name="sendEmail">
          {(field) => (
            <div className="flex flex-col gap-1.5">
              <Label>Delivery</Label>
              <div className="flex h-9 items-center gap-2 whitespace-nowrap text-sm">
                <Switch
                  aria-label="Email invitation"
                  checked={field.state.value}
                  onCheckedChange={field.handleChange}
                  size="sm"
                />
                Email link
              </div>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-h-9 items-center justify-between">
            <span className="font-medium text-sm">Users</span>
            <Badge variant="outline">{users.length}</Badge>
          </div>
          <div className="divide-y rounded-md border">
            {users.length === 0 ? (
              <p className="p-3 text-muted-foreground text-sm">
                No staff users found.
              </p>
            ) : (
              users.map((user) => (
                <div className="flex items-center gap-3 p-3" key={user.id}>
                  <ShieldCheckIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">
                      {user.name || user.email}
                    </div>
                    <div className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </div>
                  </div>
                  <Badge
                    variant={
                      user.role === 'super_admin' ? 'success' : 'outline'
                    }
                  >
                    {roleLabel(user.role)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex min-h-9 items-center justify-between">
            <span className="font-medium text-sm">Recent invitations</span>
            <Badge variant="outline">{invitations.length}</Badge>
          </div>
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
                  <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-sm">
                      {invitation.email}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Expires{' '}
                      {dayjs(invitation.expiresAt).format('MMM DD, YYYY')}
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
