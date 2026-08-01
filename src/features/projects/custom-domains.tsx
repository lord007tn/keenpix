import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  CheckIcon,
  CopyIcon,
  Globe2Icon,
  PlusIcon,
  RefreshCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/errors/common'
import {
  createCustomDomainFn,
  deleteCustomDomainFn,
  listCustomDomainsFn,
  refreshCustomDomainFn,
} from '@/functions/custom-domains'
import { createCustomDomainSchema } from '@/schemas/custom-domains'
import { getFieldError } from '@/utils/validation/form-errors'

function statusBadge(status: string) {
  if (status === 'verified' || status === 'active') {
    return <Badge variant="success">{status}</Badge>
  }
  if (status === 'error') {
    return <Badge variant="destructive">error</Badge>
  }
  return <Badge variant="warning">{status}</Badge>
}

export function CustomDomains({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState<string | null>(null)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [removeId, setRemoveId] = useState<string | null>(null)
  const queryKey = ['custom-domains', projectId]
  const query = useQuery({
    queryKey,
    queryFn: () => listCustomDomainsFn({ data: { projectId } }),
  })
  const refresh = useMutation({
    mutationFn: (id: string) =>
      refreshCustomDomainFn({ data: { id, projectId } }),
    onSuccess: async (domain) => {
      toast.success(
        domain.sslStatus === 'active'
          ? `${domain.hostname} is live`
          : 'Status refreshed — DNS or TLS is still provisioning',
      )
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not refresh domain status')),
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      deleteCustomDomainFn({ data: { id, projectId } }),
    onSuccess: async () => {
      setRemoveId(null)
      toast.success('Custom domain removed')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not remove custom domain')),
  })
  const form = useForm({
    defaultValues: { hostname: '', projectId },
    validators: {
      onChange: createCustomDomainSchema,
      onSubmit: createCustomDomainSchema,
    },
    onSubmit: async ({ value }) => {
      setProvisionError(null)
      try {
        await createCustomDomainFn({
          data: createCustomDomainSchema.parse({ ...value, projectId }),
        })
        form.reset()
        toast.success('Custom domain added — configure the DNS records below')
        await queryClient.invalidateQueries({ queryKey })
      } catch (error) {
        const message = getErrorMessage(error, 'Could not add custom domain')
        setProvisionError(message)
        toast.error(message)
      }
    },
  })

  if (query.isPending) {
    return <Skeleton className="h-40" />
  }
  if (query.isError || !query.data) {
    return (
      <Alert variant="destructive">
        <Globe2Icon />
        <AlertTitle>Couldn’t load custom domains</AlertTitle>
        <AlertDescription>
          Retry this page. If the problem continues, check the Cloudflare for
          SaaS configuration.
        </AlertDescription>
      </Alert>
    )
  }

  const { access, domains } = query.data
  const atLimit = access.limit !== null && access.used >= access.limit
  const allowance =
    access.limit === null
      ? 'Unlimited custom domains'
      : `${access.used} of ${access.limit} custom domains used`
  let unavailable: { description: string; title: string } | undefined
  if (!access.configured) {
    unavailable = {
      title: 'Provisioning is not configured',
      description:
        'The platform operator must configure Cloudflare for SaaS before domains can be added.',
    }
  } else if (access.limit === 0) {
    unavailable = {
      title: 'Upgrade for custom domains',
      description:
        'Custom delivery domains are included with Pro and Business plans.',
    }
  } else if (atLimit) {
    let description = `${access.planName} includes ${access.limit} custom domains. Upgrade to Business for a larger allowance.`
    if (access.planId === 'business' && access.limit === 10) {
      description =
        'Business includes 10 custom domains. Add the five-domain pack from Billing for $5/month.'
    } else if (access.planId === 'business') {
      description =
        'This workspace has reached the current Business maximum of 15 custom domains.'
    }
    unavailable = {
      title: 'Custom-domain limit reached',
      description,
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          Branded URLs resolve this project without a{' '}
          <span className="font-mono">?project=</span> parameter.
        </span>
        <Badge variant="outline">{allowance}</Badge>
      </div>

      {unavailable ? (
        <Alert>
          <Globe2Icon />
          <AlertTitle>{unavailable.title}</AlertTitle>
          <AlertDescription>{unavailable.description}</AlertDescription>
        </Alert>
      ) : (
        <form
          className="flex items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <form.Field name="hostname">
            {(field) => {
              const error = getFieldError(field.state.meta)
              return (
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex gap-2">
                    <Input
                      aria-invalid={Boolean(error)}
                      aria-label="Custom delivery domain"
                      className="font-mono text-xs"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="images.example.com"
                      value={field.state.value}
                    />
                    <form.Subscribe
                      selector={(state) => [
                        state.canSubmit,
                        state.isSubmitting,
                      ]}
                    >
                      {([canSubmit, isSubmitting]) => (
                        <Button
                          disabled={!canSubmit || isSubmitting}
                          size="sm"
                          type="submit"
                        >
                          <PlusIcon data-icon="inline-start" />
                          {isSubmitting ? 'Adding…' : 'Add domain'}
                        </Button>
                      )}
                    </form.Subscribe>
                  </div>
                  {error ? (
                    <p className="text-destructive text-xs">{error}</p>
                  ) : null}
                  {provisionError ? (
                    <p className="text-destructive text-xs" role="alert">
                      {provisionError}
                    </p>
                  ) : null}
                </div>
              )
            }}
          </form.Field>
        </form>
      )}

      <div className="flex flex-col gap-3">
        {domains.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground text-sm">
            No custom domains connected to this project.
          </p>
        ) : null}
        {domains.map((domain) => (
          <div className="rounded-lg border p-4" key={domain.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium font-mono text-sm">
                    {domain.hostname}
                  </span>
                  {statusBadge(domain.dnsStatus)}
                  {statusBadge(domain.sslStatus)}
                </div>
                <p className="mt-1 truncate font-mono text-muted-foreground text-xs">
                  {domain.transformUrl}
                </p>
                {domain.lastCheckedAt ? (
                  <p className="mt-1 text-muted-foreground text-xs">
                    Checked{' '}
                    {dayjs(domain.lastCheckedAt).format('MMM D, YYYY, h:mm A')}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  disabled={refresh.isPending}
                  onClick={() => refresh.mutate(domain.id)}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCcwIcon data-icon="inline-start" />
                  Refresh
                </Button>
                <Button
                  aria-label={`Remove ${domain.hostname}`}
                  onClick={() => setRemoveId(domain.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>

            {domain.lastError ? (
              <Alert className="mt-4" variant="destructive">
                <AlertTitle>Domain needs attention</AlertTitle>
                <AlertDescription>{domain.lastError}</AlertDescription>
              </Alert>
            ) : null}

            {domain.records.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-md border">
                <div className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1.4fr)_40px] gap-2 border-b bg-muted/40 px-3 py-2 font-medium text-muted-foreground text-xs">
                  <span>Type</span>
                  <span>Name</span>
                  <span>Value</span>
                  <span className="sr-only">Copy</span>
                </div>
                {domain.records.map((record) => {
                  const key = `${record.type}:${record.name}:${record.value}`
                  return (
                    <div
                      className="grid grid-cols-[72px_minmax(0,1fr)_minmax(0,1.4fr)_40px] items-center gap-2 border-b px-3 py-2 font-mono text-xs last:border-b-0"
                      key={key}
                    >
                      <span className="font-semibold">{record.type}</span>
                      <span className="truncate" title={record.name}>
                        {record.name}
                      </span>
                      <span className="truncate" title={record.value}>
                        {record.value}
                      </span>
                      <Button
                        aria-label={`Copy ${record.type} record`}
                        onClick={async () => {
                          await navigator.clipboard.writeText(record.value)
                          setCopied(key)
                          toast.success('DNS value copied')
                        }}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        {copied === key ? <CheckIcon /> : <CopyIcon />}
                      </Button>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRemoveId(null)
          }
        }}
        open={removeId !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove custom domain?</DialogTitle>
            <DialogDescription>
              Cloudflare will stop serving this hostname and its branded image
              URLs will no longer work. Remove the customer’s DNS record after
              this completes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setRemoveId(null)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={remove.isPending}
              onClick={() => {
                if (removeId) {
                  remove.mutate(removeId)
                }
              }}
              variant="destructive"
            >
              {remove.isPending ? 'Removing…' : 'Remove domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
