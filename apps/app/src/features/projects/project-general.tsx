import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { SettingRow } from '@/components/app/setting-row'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { deleteProjectFn, updateProjectFn } from '@/functions/projects'
import { updateProjectSchema } from '@/schemas/projects'
import type { Project } from '@/shared/types'
import { useProject } from '@/stores/project-context'
import { getFieldError } from '@/utils/validation/form-errors'

// General project settings: the copyable id, plus an editable name + origin form
// and a type-to-confirm delete. Editing/deleting is owner/admin-only (canManage);
// members see the details read-only. Deleting frees a plan project slot, so a
// tenant at its cap is never permanently stranded. Parent keys this by project id
// so switching projects remounts with fresh defaults.
export function ProjectGeneral({
  canManage,
  project,
}: {
  canManage: boolean
  project: Project
}) {
  const router = useRouter()
  const { setProject } = useProject()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const form = useForm({
    defaultValues: {
      projectId: project.id,
      name: project.name,
      origin: project.origin,
    },
    validators: {
      onChange: updateProjectSchema,
      onSubmit: updateProjectSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await updateProjectFn({ data: updateProjectSchema.parse(value) })
        toast.success('Project updated')
        await router.invalidate()
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not update project'))
      }
    },
  })

  async function remove() {
    setDeleting(true)
    try {
      await deleteProjectFn({ data: { projectId: project.id } })
      toast.success('Project deleted')
      setConfirmOpen(false)
      // Drop the ?project= scope (the project is gone) and refresh loaders.
      setProject(null)
      await router.invalidate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not delete project'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Identifiers and origin for this project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <SettingRow
            className="sm:items-start"
            description="Cloud delivery: https://cdn.keenpix.com/p/<project-id>/img/<source-url>"
            label="Project ID"
          >
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {project.id}
              </code>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(project.id)
                  toast.success('Project ID copied')
                }}
                size="sm"
                variant="outline"
              >
                Copy
              </Button>
            </div>
          </SettingRow>

          {canManage ? (
            <form
              className="flex flex-col gap-4 border-t pt-6"
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
                      <Label htmlFor={field.name}>Project name</Label>
                      <Input
                        aria-invalid={!!error}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        value={field.state.value}
                      />
                      {error ? (
                        <p className="text-destructive text-xs">{error}</p>
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
                        aria-invalid={!!error}
                        className="font-mono text-xs"
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        value={field.state.value}
                      />
                      {error ? (
                        <p className="text-destructive text-xs">{error}</p>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Where keenpix fetches originals from. Re-pointing does
                          not change the allowlist — update it under Security.
                        </span>
                      )}
                    </div>
                  )
                }}
              </form.Field>
              <form.Subscribe
                selector={(state) => [
                  state.canSubmit,
                  state.isSubmitting,
                  state.isDirty,
                ]}
              >
                {([canSubmit, isSubmitting, isDirty]) => (
                  <div>
                    <Button
                      disabled={!(canSubmit && isDirty) || isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? 'Saving…' : 'Save changes'}
                    </Button>
                  </div>
                )}
              </form.Subscribe>
            </form>
          ) : (
            <SettingRow
              className="border-t pt-6 sm:items-start"
              description="Where keenpix fetches originals from."
              label="Origin"
            >
              <code className="break-all font-mono text-muted-foreground text-xs">
                {project.origin}
              </code>
            </SettingRow>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Deleting a project removes its request logs and frees a plan
              project slot. This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setConfirmOpen(true)} variant="destructive">
              Delete project
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This permanently deletes{' '}
              <span className="font-medium">{project.name}</span> and its
              request logs. New image requests that reach Keenpix will be
              rejected. Previously cached images may remain available until
              their cache expires. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (confirmName.trim() === project.name) {
                remove()
              }
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-project-name">
                Type <span className="font-mono">{project.name}</span> to
                confirm
              </Label>
              <Input
                autoComplete="off"
                id="confirm-project-name"
                onChange={(e) => setConfirmName(e.target.value)}
                value={confirmName}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => setConfirmOpen(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={deleting || confirmName.trim() !== project.name}
                type="submit"
                variant="destructive"
              >
                {deleting ? 'Deleting…' : 'Permanently delete'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
