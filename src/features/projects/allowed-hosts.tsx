import { useForm } from '@tanstack/react-form'
import { useRouter } from '@tanstack/react-router'
import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/errors/common'
import { addAllowedHostFn, removeAllowedHostFn } from '@/functions/projects'
import { allowedHostSchema } from '@/schemas/projects'
import { getFieldError } from '@/utils/validation/form-errors'

export function AllowedHosts({
  projectId,
  initial,
}: {
  projectId: string
  initial: string[]
}) {
  const router = useRouter()
  const [hosts, setHosts] = useState<string[]>(initial)
  const form = useForm({
    defaultValues: {
      projectId,
      host: '',
    },
    validators: {
      onChange: allowedHostSchema,
      onSubmit: allowedHostSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = allowedHostSchema.parse({ ...value, projectId })
      try {
        const res = await addAllowedHostFn({ data: payload })
        setHosts(res.allowedOrigins)
        form.reset()
        toast.success('Allowed host added')
        await router.invalidate()
      } catch (e) {
        toast.error(getErrorMessage(e, 'Could not add host'))
      }
    },
  })

  async function remove(host: string) {
    const prev = hosts
    setHosts(hosts.filter((h) => h !== host))
    try {
      const res = await removeAllowedHostFn({
        data: allowedHostSchema.parse({ projectId, host }),
      })
      setHosts(res.allowedOrigins)
      toast.success(`Removed ${host}`)
      await router.invalidate()
    } catch {
      setHosts(prev)
      toast.error('Could not remove host')
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-80">
      <div className="flex flex-wrap gap-1.5">
        {hosts.length === 0 ? (
          <span className="text-muted-foreground text-xs">
            No hosts yet — keenpix will refuse all origins.
          </span>
        ) : null}
        {hosts.map((h) => (
          <Badge className="h-7 gap-1 pr-1" key={h} variant="secondary">
            <span className="font-mono">{h}</span>
            <button
              aria-label={`Remove ${h}`}
              className="-mr-0.5 inline-flex size-5 items-center justify-center rounded-sm hover:bg-foreground/10"
              onClick={() => remove(h)}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <form
        className="flex flex-col gap-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          form.handleSubmit()
        }}
      >
        <form.Field name="host">
          {(field) => {
            const error = getFieldError(field.state.meta)
            return (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <Input
                    aria-describedby={error ? `${field.name}-error` : undefined}
                    aria-invalid={!!error}
                    aria-label="Add allowed host"
                    className="font-mono text-xs"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="images.example.com"
                    value={field.state.value}
                  />
                  <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        disabled={!canSubmit || isSubmitting}
                        size="sm"
                        type="submit"
                        variant="outline"
                      >
                        <PlusIcon data-icon="inline-start" />
                        Add
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
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
      </form>
    </div>
  )
}
