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
import { createProjectFn } from '@/functions/projects'
import { getErrorMessage } from '@/lib/errors'
import type { ProjectEnv } from '@/shared/types'

const ENVS: ProjectEnv[] = ['production', 'staging', 'development']

interface ProjectFormErrors {
  name?: string
  origin?: string
}

function validateProjectForm(name: string, origin: string): ProjectFormErrors {
  const errors: ProjectFormErrors = {}
  const trimmedName = name.trim()
  const trimmedOrigin = origin.trim()

  if (!trimmedName) {
    errors.name = 'Enter a project name.'
  } else if (trimmedName.length > 80) {
    errors.name = 'Use 80 characters or fewer.'
  }

  if (trimmedOrigin) {
    try {
      const url = new URL(trimmedOrigin)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.origin = 'Use an http or https URL.'
      } else if (!url.hostname) {
        errors.origin = 'Enter a URL with a hostname.'
      }
    } catch {
      errors.origin = 'Enter a valid URL, for example https://cdn.acme.shop.'
    }
  } else {
    errors.origin = 'Enter an origin URL.'
  }

  return errors
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
  const [name, setName] = useState('')
  const [origin, setOrigin] = useState('')
  const [env, setEnv] = useState<ProjectEnv>('production')
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<ProjectFormErrors>({})

  function reset() {
    setName('')
    setOrigin('')
    setEnv('production')
    setErrors({})
  }

  function setOpen(next: boolean) {
    if (!isControlled) {
      setInternalOpen(next)
    }
    onOpenChange?.(next)
    if (!next) {
      reset()
    }
  }

  async function submit() {
    const trimmedName = name.trim()
    const trimmedOrigin = origin.trim()
    const nextErrors = validateProjectForm(trimmedName, trimmedOrigin)
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setPending(true)
    try {
      const project = await createProjectFn({
        data: { name: trimmedName, origin: trimmedOrigin, env },
      })
      toast.success(`Created project ${project.name}`)
      // Refresh the layout loader so the new project shows in sidebar + dashboard.
      await router.invalidate()
      setOpen(false)
    } catch (e) {
      const message = getErrorMessage(e, 'Could not create project')
      setErrors((current) => ({ ...current, origin: message }))
      toast.error('Could not create project')
    } finally {
      setPending(false)
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
            submit()
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              aria-describedby={errors.name ? 'project-name-error' : undefined}
              aria-invalid={!!errors.name}
              autoFocus
              id="project-name"
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) {
                  setErrors((current) => ({ ...current, name: undefined }))
                }
              }}
              placeholder="acme.shop"
              value={name}
            />
            {errors.name ? (
              <p className="text-destructive text-xs" id="project-name-error">
                {errors.name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-origin">Origin URL</Label>
            <Input
              aria-describedby={
                errors.origin ? 'project-origin-error' : 'project-origin-help'
              }
              aria-invalid={!!errors.origin}
              className="font-mono text-xs"
              id="project-origin"
              onChange={(e) => {
                setOrigin(e.target.value)
                if (errors.origin) {
                  setErrors((current) => ({ ...current, origin: undefined }))
                }
              }}
              placeholder="https://cdn.acme.shop"
              value={origin}
            />
            {errors.origin ? (
              <p className="text-destructive text-xs" id="project-origin-error">
                {errors.origin}
              </p>
            ) : (
              <span
                className="text-muted-foreground text-xs"
                id="project-origin-help"
              >
                The origin's hostname is added to the allowlist automatically.
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Environment</Label>
            <Select onValueChange={(v) => setEnv(v as ProjectEnv)} value={env}>
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
          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending} type="submit">
              {pending ? 'Creating…' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
