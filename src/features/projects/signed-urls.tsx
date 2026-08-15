import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, CopyIcon, RefreshCwIcon } from 'lucide-react'
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
  const queryKey = ['project-signing', projectId]
  const { data, isPending } = useQuery({
    queryKey,
    queryFn: () => getProjectSigningFn({ data: { projectId } }),
  })

  const toggle = useMutation({
    mutationFn: (requireSignedUrls: boolean) =>
      updateProjectSigningFn({ data: { projectId, requireSignedUrls } }),
    onSuccess: (signing) => {
      queryClient.setQueryData(queryKey, signing)
      toast.success(
        signing.requireSignedUrls
          ? 'Signed URLs required — unsigned requests now get 403'
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
          onCheckedChange={(checked) => toggle.mutate(checked)}
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
        </div>
      ) : null}

      <Dialog onOpenChange={setConfirmRotate} open={confirmRotate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate the signing secret?</DialogTitle>
            <DialogDescription>
              Every URL signed with the current secret stops working
              immediately. Update your integrations with the new secret right
              after rotating.
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
