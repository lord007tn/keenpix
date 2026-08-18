import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LaptopIcon, LoaderCircleIcon, SmartphoneIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

const MOBILE_RE = /mobi|android|iphone|ipad|ipod/i
const BROWSER_RES: [RegExp, string][] = [
  [/edg/i, 'Edge'],
  [/opr|opera/i, 'Opera'],
  [/chrome|crios/i, 'Chrome'],
  [/firefox|fxios/i, 'Firefox'],
  [/safari/i, 'Safari'],
]
const OS_RES: [RegExp, string][] = [
  [/windows/i, 'Windows'],
  [/mac os|macintosh/i, 'macOS'],
  [/android/i, 'Android'],
  [/iphone|ipad|ipod/i, 'iOS'],
  [/linux/i, 'Linux'],
]

function match(res: [RegExp, string][], ua: string): string | null {
  for (const [re, label] of res) {
    if (re.test(ua)) {
      return label
    }
  }
  return null
}

function deviceLabel(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'Unknown device'
  }
  const browser = match(BROWSER_RES, userAgent)
  const os = match(OS_RES, userAgent)
  if (browser && os) {
    return `${browser} on ${os}`
  }
  return browser ?? os ?? 'Unknown device'
}

function formatDate(value: string | Date | undefined): string {
  if (!value) {
    return ''
  }
  const d = value instanceof Date ? value : new Date(value)
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Active sessions across the user's devices, with per-session revoke and a
// "sign out everywhere else" action. Session data is client-fetched; the list
// refreshes after any revoke.
export function SessionsList() {
  const queryClient = useQueryClient()
  const sessionsQuery = useQuery({
    queryKey: ['account', 'sessions'],
    queryFn: async () => {
      const [list, current] = await Promise.all([
        authClient.listSessions(),
        authClient.getSession(),
      ])
      if (list.error) {
        throw new Error(list.error.message ?? 'Could not load sessions')
      }
      return {
        sessions: list.data ?? [],
        currentToken: current.data?.session?.token ?? null,
      }
    },
  })

  const revokeOne = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await authClient.revokeSession({ token })
      if (error) {
        throw new Error(error.message ?? 'Could not sign out that device')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] })
      toast.success('Device signed out')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not sign out')),
  })

  const revokeOthers = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions()
      if (error) {
        throw new Error(error.message ?? 'Could not sign out other devices')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] })
      toast.success('Signed out of all other devices')
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not sign out')),
  })

  if (sessionsQuery.isPending) {
    return (
      <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        Loading sessions…
      </div>
    )
  }

  if (sessionsQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-2 py-2">
        <p className="text-destructive text-sm">
          Couldn’t load your active sessions.
        </p>
        <Button
          onClick={() => sessionsQuery.refetch()}
          size="sm"
          variant="outline"
        >
          Retry
        </Button>
      </div>
    )
  }

  const { sessions, currentToken } = sessionsQuery.data
  const others = sessions.filter((s) => s.token !== currentToken).length

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-md border">
        {sessions.map((s) => {
          const isCurrent = s.token === currentToken
          const Icon = MOBILE_RE.test(s.userAgent ?? '')
            ? SmartphoneIcon
            : LaptopIcon
          return (
            <li className="flex items-center gap-3 px-3 py-3" key={s.id}>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 font-medium text-sm">
                  {deviceLabel(s.userAgent)}
                  {isCurrent ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-[10px] text-primary uppercase tracking-wide">
                      This device
                    </span>
                  ) : null}
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  {s.ipAddress ? `${s.ipAddress} · ` : ''}Signed in{' '}
                  {formatDate(s.createdAt)}
                </span>
              </div>
              <div className="flex-1" />
              {isCurrent ? null : (
                <Button
                  disabled={revokeOne.isPending}
                  onClick={() => revokeOne.mutate(s.token)}
                  size="sm"
                  variant="ghost"
                >
                  Sign out
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {others > 0 ? (
        <Button
          className="self-start"
          disabled={revokeOthers.isPending}
          onClick={() => revokeOthers.mutate()}
          size="sm"
          variant="outline"
        >
          Sign out of all other devices ({others})
        </Button>
      ) : null}
    </div>
  )
}
