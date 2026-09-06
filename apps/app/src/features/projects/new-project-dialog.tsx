import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouteContext, useRouter } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { getBillingStateFn } from '@/functions/billing'
import { createProjectFn } from '@/functions/projects'
import { trackFunnelMilestone } from '@/lib/analytics/client'
import { createProjectSchema } from '@/schemas/projects'
import { useProject } from '@/stores/project-context'
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
  const formId = useId()
  const router = useRouter()
  const { setProject } = useProject()
  const { cloud } = useRouteContext({ from: '/app' })
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  // Gate the form on an entitled plan so an unsubscribed cloud user gets the
  // choose-a-plan prompt up front — not a server error after filling the form.
  const { data: billing } = useQuery({
    queryKey: ['billing-state'],
    queryFn: () => getBillingStateFn(),
    enabled: cloud && open,
    staleTime: 30_000,
  })
  const needsPlan = cloud && billing !== undefined && billing.plan === null
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
        trackFunnelMilestone('project_created')
        toast.success(`Created project ${project.name}`)
        // Refresh layout/dashboard loaders so the new project appears everywhere,
        // then switch scope to it so the user lands ready to add allowed hosts.
        await router.invalidate({ sync: true })
        setProject(project.id)
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
            {needsPlan
              ? 'Projects need an active plan.'
              : 'A project is one origin + one allowlist + its own request logs.'}
          </DialogDescription>
        </DialogHeader>
        {needsPlan ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">
              Start your free trial to create projects and deliver images —
              every plan begins with 14 days free, and trial usage is never
              billed.
            </p>
            <Link
              className={buttonVariants()}
              onClick={() => setOpen(false)}
              search={{ section: 'billing' }}
              to="/app/settings"
            >
              Choose a plan
            </Link>
          </div>
        ) : (
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
                    <Label htmlFor={`${formId}-${field.name}`}>Name</Label>
                    <Input
                      aria-describedby={
                        error ? `${formId}-${field.name}-error` : undefined
                      }
                      aria-invalid={!!error}
                      autoFocus
                      id={`${formId}-${field.name}`}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="acme.shop"
                      value={field.state.value}
                    />
                    {error ? (
                      <p
                        className="text-destructive text-xs"
                        id={`${formId}-${field.name}-error`}
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
                    <Label htmlFor={`${formId}-${field.name}`}>
                      Origin URL
                    </Label>
                    <Input
                      aria-describedby={
                        error
                          ? `${formId}-${field.name}-error`
                          : `${formId}-${field.name}-help`
                      }
                      aria-invalid={!!error}
                      className="font-mono text-xs"
                      id={`${formId}-${field.name}`}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="https://cdn.acme.shop"
                      value={field.state.value}
                    />
                    {error ? (
                      <p
                        className="text-destructive text-xs"
                        id={`${formId}-${field.name}-error`}
                      >
                        {error}
                      </p>
                    ) : (
                      <span
                        className="text-muted-foreground text-xs"
                        id={`${formId}-${field.name}-help`}
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
        )}
      </DialogContent>
    </Dialog>
  )
}
