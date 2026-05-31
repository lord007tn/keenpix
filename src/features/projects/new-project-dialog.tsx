import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getErrorMessage } from '@/errors/common'
import { createProjectFn } from '@/functions/projects'
import { getFieldError } from '@/lib/form-errors'
import { createProjectSchema } from '@/schemas/projects'
import { isProjectEnv, type ProjectEnv } from '@/shared/types'

const ENVS: ProjectEnv[] = ['production', 'staging', 'development']
const DEFAULT_VALUES: { name: string; origin: string; env: ProjectEnv } = {
  name: '',
  origin: '',
  env: 'production',
}

export function NewProjectDialog({
  open: controlledOpen,
  onOpenChange,
}: {
  /** Controlled open state — when provided, no built-in trigger is rendered. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    validators: {
      onChange: createProjectSchema,
      onSubmit: createProjectSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = createProjectSchema.parse(value)
      try {
        const project = await createProjectFn({ data: payload })
        toast.success(`Created project ${project.name}`)
        // Refresh the layout loader so the new project shows in sidebar + dashboard.
        await router.invalidate()
        setOpen(false)
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not create project'))
      }
    },
  })

  function setOpen(next: boolean) {
    if (!isControlled) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
    if (!next) {
      form.reset()
    }
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      {isControlled ? null : (
        <DialogTrigger render={<Button size="sm" />}>
          <PlusIcon data-icon="inline-start" />
          New project
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            A project is one origin + one allowlist + its own request logs.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => {
              const error = getFieldError(field.state.meta)
              return (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    aria-describedby={error ? `${field.name}-error` : undefined}
                    aria-invalid={!!error}
                    autoFocus
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="acme.shop"
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
          <form.Field name="origin">
            {(field) => {
              const error = getFieldError(field.state.meta)
              return (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={field.name}>Origin URL</Label>
                  <Input
                    aria-describedby={
                      error ? `${field.name}-error` : `${field.name}-help`
                    }
                    aria-invalid={!!error}
                    className="font-mono text-xs"
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="https://cdn.acme.shop"
                    value={field.state.value}
                  />
                  {error ? (
                    <p
                      className="text-destructive text-xs"
                      id={`${field.name}-error`}
                    >
                      {error}
                    </p>
                  ) : (
                    <span
                      className="text-muted-foreground text-xs"
                      id={`${field.name}-help`}
                    >
                      The origin's hostname is added to the allowlist
                      automatically.
                    </span>
                  )}
                </div>
              )
            }}
          </form.Field>
          <form.Field name="env">
            {(field) => (
              <div className="flex flex-col gap-1.5">
                <Label>Environment</Label>
                <Select
                  onValueChange={(v) => {
                    if (isProjectEnv(v)) {
                      field.handleChange(v)
                    }
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger aria-label="Environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVS.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
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
                  {isSubmitting ? 'Creating...' : 'Create project'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
