import { useRouter } from '@tanstack/react-router'
import { PlusIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/errors/common'
import { addAllowedHostFn, removeAllowedHostFn } from '@/functions/projects'

export function AllowedHosts({
  projectId,
  initial,
}: {
  projectId: string
  initial: string[]
}) {
  const router = useRouter()
  const [hosts, setHosts] = useState<string[]>(initial)
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)

  async function add() {
    if (!value.trim()) {
      return
    }
    setPending(true)
    try {
      const res = await addAllowedHostFn({ data: { projectId, host: value } })
      setHosts(res.allowedOrigins)
      setValue('')
      toast.success('Allowed host added')
      // Keep the /app projects loader fresh so switching projects shows it too.
      await router.invalidate()
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not add host'))
    } finally {
      setPending(false)
    }
  }

  async function remove(host: string) {
    const prev = hosts
    setHosts(hosts.filter((h) => h !== host))
    try {
      const res = await removeAllowedHostFn({ data: { projectId, host } })
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
      <div className="flex gap-2">
        <Input
          aria-label="Add allowed host"
          className="font-mono text-xs"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="images.example.com"
          value={value}
        />
        <Button disabled={pending} onClick={add} size="sm" variant="outline">
          <PlusIcon data-icon="inline-start" />
          Add
        </Button>
      </div>
    </div>
  )
}
