import { useForm } from '@tanstack/react-form'
import dayjs from 'dayjs'
import {
  ActivityIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCopyIcon,
  KeyRoundIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel as SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/errors/common'
import {
  createOrgApiKeyFn,
  disableOrgApiKeyFn,
  getOrgApiKeyActivitiesFn,
  getOrgApiKeysFn,
} from '@/functions/api-keys'
import { ACTIVITY_PAGE_SIZE } from '@/schemas/admin'
import { createApiKeySchema } from '@/schemas/api-keys'
import { getFieldError } from '@/utils/validation/form-errors'

const ALL_PROJECTS_SCOPE = '__all_projects__'

type WorkspaceData = Awaited<ReturnType<typeof getOrgApiKeysFn>>
type CreatedApiKey = Awaited<ReturnType<typeof createOrgApiKeyFn>>
type ActivityRow = WorkspaceData['apiKeyActivities'][number]

function projectScopeLabel(
  projects: Array<{ id: string; name: string }>,
  projectId?: string | null,
) {
  if (!projectId) {
    return 'All projects'
  }
  return projects.find((project) => project.id === projectId)?.name ?? projectId
}

function statusVariant(status: number) {
  if (status >= 200 && status < 300) {
    return 'success'
  }
  if (status >= 400) {
    return 'destructive'
  }
  return 'outline'
}

async function copyKey(text: string) {
  try {
    if (!navigator.clipboard) {
      throw new Error('Clipboard API is unavailable')
    }
    await navigator.clipboard.writeText(text)
    toast.success('API key copied')
  } catch {
    toast.error('Failed to copy API key')
  }
}

// Create flow lives in a modal: collect name + scope, then reveal the key once.
function CreateApiKeyDialog({
  projects,
  onCreated,
}: {
  projects: WorkspaceData['projects']
  onCreated: (created: CreatedApiKey, projectId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState('')
  const form = useForm({
    defaultValues: { name: '', projectId: ALL_PROJECTS_SCOPE },
    validators: {
      onChange: createApiKeySchema,
      onSubmit: createApiKeySchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const created = await createOrgApiKeyFn({
          data: {
            name: value.name,
            projectId:
              value.projectId === ALL_PROJECTS_SCOPE ? '' : value.projectId,
          },
        })
        onCreated(
          created,
          value.projectId === ALL_PROJECTS_SCOPE ? null : value.projectId,
        )
        // Keep the dialog open to reveal the key — it is only shown once.
        setCreatedKey(created.key)
        toast.success('API key created')
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not create API key'))
      }
    },
  })

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) {
      form.reset()
      setCreatedKey('')
    }
  }

  return (
    <Dialog onOpenChange={changeOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>
        <KeyRoundIcon data-icon="inline-start" />
        Create API key
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? 'API key created' : 'Create API key'}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? 'Copy it now — it is shown only once. Store it in the calling system as a secret.'
              : 'Keys let trusted internal systems manage projects, domains, and pipeline settings over the JSON API.'}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                aria-label="New API key"
                className="font-mono text-xs"
                readOnly
                value={createdKey}
              />
              <Button onClick={() => copyKey(createdKey)} variant="outline">
                <ClipboardCopyIcon data-icon="inline-start" />
                Copy
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => changeOpen(false)} type="button">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              form.handleSubmit()
            }}
          >
            <form.Field name="name">
              {(field) => {
                const error = getFieldError(field.state.meta)
                return (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={field.name}>Key name</Label>
                    <Input
                      aria-describedby={
                        error ? `${field.name}-error` : undefined
                      }
                      aria-invalid={!!error}
                      autoFocus
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Internal integration"
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
            </form.Field>
            <form.Field name="projectId">
              {(field) => (
                <div className="flex flex-col gap-1.5">
                  <Label>Scope</Label>
                  <Select
                    onValueChange={(value) =>
                      field.handleChange(value ?? ALL_PROJECTS_SCOPE)
                    }
                    value={field.state.value}
                  >
                    <SelectTrigger
                      aria-label="API key scope"
                      className="w-full"
                    >
                      <SelectValue>
                        {(value) =>
                          projectScopeLabel(
                            projects,
                            value === ALL_PROJECTS_SCOPE ? null : value,
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectGroupLabel>Scope</SelectGroupLabel>
                        <SelectItem value={ALL_PROJECTS_SCOPE}>
                          All projects
                        </SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <DialogFooter>
              <Button
                onClick={() => changeOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button disabled={!canSubmit || isSubmitting} type="submit">
                    {isSubmitting ? 'Creating...' : 'Create key'}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function ApiKeyManagement() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityPage, setActivityPage] = useState(1)
  const apiKeys = workspace?.apiKeys ?? []
  const projects = workspace?.projects ?? []

  const load = useCallback(async () => {
    try {
      const data = await getOrgApiKeysFn()
      setWorkspace(data)
      setActivities(data.apiKeyActivities)
      setActivityTotal(data.apiKeyActivitiesTotal)
      setActivityPage(1)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load API keys'))
    }
  }, [])

  async function changeActivityPage(next: number) {
    try {
      const res = await getOrgApiKeyActivitiesFn({ data: { page: next } })
      setActivities(res.activities)
      setActivityTotal(res.total)
      setActivityPage(next)
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not load API activity'))
    }
  }

  useEffect(() => {
    load()
  }, [load])

  function handleCreated(created: CreatedApiKey, projectId: string | null) {
    setWorkspace((current) =>
      current
        ? {
            ...current,
            apiKeys: [
              {
                id: created.id,
                name: created.name,
                start: created.start,
                prefix: created.prefix,
                enabled: created.enabled,
                requestCount: created.requestCount,
                lastRequest: created.lastRequest,
                expiresAt: created.expiresAt,
                createdAt: created.createdAt,
                projectId,
              },
              ...current.apiKeys,
            ],
          }
        : current,
    )
  }

  async function disable(id: string) {
    const previous = workspace
    setWorkspace((current) =>
      current
        ? {
            ...current,
            apiKeys: current.apiKeys.map((apiKey) =>
              apiKey.id === id ? { ...apiKey, enabled: false } : apiKey,
            ),
          }
        : current,
    )
    try {
      await disableOrgApiKeyFn({ data: { id } })
      toast.success('API key disabled')
    } catch (e) {
      setWorkspace(previous)
      toast.error(getErrorMessage(e, 'Could not disable API key'))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <CardDescription>
        Create keys for trusted internal systems that need to manage Keenpix
        projects, domains, and pipeline settings over the JSON API.
      </CardDescription>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">API keys</span>
          <Badge variant="outline">{apiKeys.length}</Badge>
        </div>
        <CreateApiKeyDialog onCreated={handleCreated} projects={projects} />
      </div>

      <div className="divide-y rounded-md border">
        {apiKeys.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          apiKeys.map((apiKey) => {
            const start = [apiKey.prefix, apiKey.start].filter(Boolean).join('')
            const projectId = apiKey.projectId
            const scopeLabel = projectId
              ? (projects.find((project) => project.id === projectId)?.name ??
                projectId)
              : 'All projects'
            return (
              <div className="flex items-center gap-3 p-3" key={apiKey.id}>
                <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-sm">
                    {apiKey.name ?? 'Unnamed key'}
                  </div>
                  <div className="truncate font-mono text-muted-foreground text-xs">
                    {start ? `${start}...` : apiKey.id}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Last used{' '}
                    {apiKey.lastRequest
                      ? dayjs(apiKey.lastRequest).format('MMM DD, YYYY')
                      : 'Never'}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Scope {scopeLabel}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {apiKey.requestCount.toLocaleString()} API calls
                  </div>
                </div>
                <Badge variant={apiKey.enabled ? 'success' : 'outline'}>
                  {apiKey.enabled ? 'active' : 'disabled'}
                </Badge>
                {apiKey.enabled ? (
                  <Button
                    aria-label={`Disable API key ${apiKey.name ?? apiKey.id}`}
                    onClick={() => disable(apiKey.id)}
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

      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">API activity</span>
        {activityTotal > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs tabular-nums">
              {(activityPage - 1) * ACTIVITY_PAGE_SIZE + 1}–
              {Math.min(activityPage * ACTIVITY_PAGE_SIZE, activityTotal)} of{' '}
              {activityTotal}
            </span>
            <Button
              aria-label="Previous activity page"
              disabled={activityPage <= 1}
              onClick={() => changeActivityPage(activityPage - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              aria-label="Next activity page"
              disabled={activityPage * ACTIVITY_PAGE_SIZE >= activityTotal}
              onClick={() => changeActivityPage(activityPage + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        ) : (
          <Badge variant="outline">0</Badge>
        )}
      </div>

      <div className="divide-y rounded-md border">
        {activities.length === 0 ? (
          <p className="p-3 text-muted-foreground text-sm">
            No API calls recorded yet.
          </p>
        ) : (
          activities.map((activity) => {
            const keyStart = [
              activity.apiKey.prefix,
              activity.apiKey.start,
            ].filter(Boolean)
            const keyLabel =
              activity.apiKey.name ??
              (keyStart.length > 0
                ? `${keyStart.join('')}...`
                : activity.apiKey.id)
            const scopeLabel = projectScopeLabel(projects, activity.projectId)
            return (
              <div className="flex items-center gap-3 p-3" key={activity.id}>
                <ActivityIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-medium text-sm">
                      {activity.method}
                    </span>
                    <span className="truncate font-mono text-xs">
                      {activity.path}
                    </span>
                  </div>
                  <div className="truncate text-muted-foreground text-xs">
                    {keyLabel} - {scopeLabel} -{' '}
                    {typeof activity.latencyMs === 'number'
                      ? `${Math.round(activity.latencyMs)}ms`
                      : 'Unknown'}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {dayjs(activity.createdAt).format('MMM DD, h:mm A')}
                  </div>
                </div>
                <Badge variant={statusVariant(activity.status)}>
                  {activity.status}
                </Badge>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
