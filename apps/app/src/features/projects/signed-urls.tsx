import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { getErrorMessage } from '@/errors/common'
import {
  getProjectSigningFn,
  rotateProjectSigningSecretFn,
  updateProjectSigningFn,
} from '@/functions/projects'

// Opt-in HMAC URL signing on top of the allowlist. The allowlist gates which
// ORIGINS keenpix will fetch; signing gates which REQUESTS it will serve — so a
// third party can't burn the project's metered managed delivery with cache-busting
// query strings once this is on.
export function SignedUrls({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [confirmRotate, setConfirmRotate] = useState(false)
  const [copied, setCopied] = useState(false)
  const [ttl, setTtl] = useState('')
  const queryKey = ['project-signing', projectId]
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getProjectSigningFn({ data: { projectId } }),
  })
  useEffect(() => {
    setTtl(data?.signedUrlTtlSeconds?.toString() ?? '')
  }, [data?.signedUrlTtlSeconds])

  const toggle = useMutation({
    mutationFn: (input: {
      requireSignedUrls: boolean
      signedUrlTtlSeconds?: number | null
    }) => updateProjectSigningFn({ data: { projectId, ...input } }),
    onSuccess: (signing) => {
      queryClient.setQueryData(queryKey, signing)
      toast.success(
        signing.requireSignedUrls
          ? 'Signed URLs required. Previously cached images may remain available.'
          : 'Signed URLs no longer required',
      )
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const rotate = useMutation({
    mutationFn: () => rotateProjectSigningSecretFn({ data: { projectId } }),
    onSuccess: (signing) => {
      queryClient.setQueryData(queryKey, signing)
      setConfirmRotate(false)
      toast.success('New signing secret generated — re-sign your URLs')
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  async function copySecret() {
    if (!data?.signingSecret) {
      return
    }
    await navigator.clipboard.writeText(data.signingSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="require-signed-urls">Require signed URLs</Label>
          <p className="text-muted-foreground text-sm">
            Every transform request must carry a valid <code>sig=</code> HMAC
            signature; unsigned requests get 403. See the{' '}
            <a
              className="underline underline-offset-2"
              href="/docs/concepts/signed-urls"
            >
              signed URLs guide
            </a>{' '}
            for how to sign.
          </p>
        </div>
        <Switch
          checked={data?.requireSignedUrls ?? false}
          disabled={isPending || toggle.isPending}
          id="require-signed-urls"
          onCheckedChange={(checked) =>
            toggle.mutate({ requireSignedUrls: checked })
          }
        />
      </div>

      {data?.signingSecret ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="signing-secret">Signing secret</Label>
          <div className="flex flex-wrap items-center gap-2">
            <code
              className="max-w-full overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-xs"
              id="signing-secret"
            >
              {data.signingSecret}
            </code>
            <Button
              aria-label="Copy signing secret"
              onClick={copySecret}
              size="sm"
              variant="outline"
            >
              {copied ? (
                <CheckIcon className="size-4" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              onClick={() => setConfirmRotate(true)}
              size="sm"
              variant="outline"
            >
              <RefreshCwIcon className="size-4" />
              Rotate
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Sign the source URL plus all query params (sorted, excluding{' '}
            <code>sig</code>) with HMAC-SHA256 and append the base64url digest
            as <code>sig=</code>.
          </p>
          <p className="text-muted-foreground text-xs">
            Current key version: <code>{data.signingKeyVersion}</code>. Include
            it as <code>kid=</code>; rotation increments the version.
          </p>

          <div className="flex max-w-md flex-col gap-2 pt-2">
            <Label htmlFor="signed-url-ttl">Maximum URL lifetime</Label>
            <div className="flex items-center gap-2">
              <Input
                id="signed-url-ttl"
                inputMode="numeric"
                min={60}
                onChange={(event) => setTtl(event.target.value)}
                placeholder="No expiration required"
                type="number"
                value={ttl}
              />
              <Button
                disabled={toggle.isPending}
                onClick={() =>
                  toggle.mutate({
                    requireSignedUrls: data.requireSignedUrls,
                    signedUrlTtlSeconds: ttl ? Number(ttl) : null,
                  })
                }
                size="sm"
                variant="outline"
              >
                Save
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Seconds, from 60 to 2,592,000 (30 days). When configured, signed
              URLs must include an <code>exp=</code> Unix timestamp and cannot
              exceed this lifetime.
            </p>
          </div>
        </div>
      ) : null}

      <Dialog onOpenChange={setConfirmRotate} open={confirmRotate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate the signing secret?</DialogTitle>
            <DialogDescription>
              Requests using the current secret will fail signature checks after
              rotation. Previously cached images may remain available until
              their caches expire or are cleared. Update your integrations with
              the new secret and key version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setConfirmRotate(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={rotate.isPending}
              onClick={() => rotate.mutate()}
              variant="destructive"
            >
              {rotate.isPending ? 'Rotating…' : 'Rotate secret'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
