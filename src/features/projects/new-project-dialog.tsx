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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/errors/common'
import { createProjectFn } from '@/functions/projects'
import { createProjectSchema } from '@/schemas/projects'
import { getFieldError } from '@/utils/validation/form-errors'

const DEFAULT_VALUES = {
  name: '',
  origin: '',
}

export function NewProjectDialog({
  open: controlledOpen,
  onOpenChange,
}: {
  // When controlled, the sidebar switcher owns the trigger and this component
  // only renders the dialog body.
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
        // Refresh layout/dashboard loaders so the new project appears everywhere.
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
        <Button onClick={() => setOpen(true)} size="sm" type="button">
          <PlusIcon data-icon="inline-start" />
          New project
        </Button>
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
