import {
  createFileRoute,
  useRouteContext,
  useRouter,
} from '@tanstack/react-router'
import { KeyRoundIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorMessage } from '@/errors/common'
import { authClient } from '@/lib/auth/client'

export const Route = createFileRoute('/app/account/')({
  component: AccountPage,
})

const NAME_SPLIT_RE = /[\s@._-]+/

function initials(base: string): string {
  const parts = base.trim().split(NAME_SPLIT_RE).filter(Boolean)
  const first = parts[0]?.[0] ?? base[0] ?? '?'
  const second = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + second).toUpperCase()
}

const THEMES = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
]

function ThemeControl() {
  const { theme, setTheme } = useTheme()
  // next-themes resolves on the client only; gate to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <ToggleGroup
      onValueChange={(v: string[]) => {
        const next = v[0]
        if (next) {
          setTheme(next)
        }
      }}
      size="sm"
      value={mounted ? [theme ?? 'system'] : []}
      variant="outline"
    >
      {THEMES.map((t) => (
        <ToggleGroupItem key={t.value} value={t.value}>
          <t.icon data-icon="inline-start" />
          {t.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function NameEditor({ initial }: { initial: string }) {
  const router = useRouter()
  const [name, setName] = useState(initial)
  const [pending, setPending] = useState(false)
  const changed = name.trim().length > 0 && name.trim() !== initial.trim()

  async function save() {
    setPending(true)
    try {
      await authClient.updateUser({ name: name.trim() })
      await router.invalidate()
      toast.success('Name updated')
    } catch (e) {
      toast.error(getErrorMessage(e, 'Could not update name'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label="Display name"
        className="w-48"
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        value={name}
      />
      <Button
        disabled={pending || !changed}
        onClick={save}
        size="sm"
        variant="outline"
      >
        Save
      </Button>
    </div>
  )
}

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{label}</span>
        {description ? (
          <span className="text-muted-foreground text-xs">{description}</span>
        ) : null}
      </div>
      <div className="w-full sm:w-auto sm:shrink-0">{children}</div>
    </div>
  )
}

function AccountPage() {
  const { user } = useRouteContext({ from: '/app' })
  const display = user.name?.trim() || user.email

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <PageHeader
        subtitle="Your profile and personal preferences."
        title="Account"
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback>{initials(display)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{display}</span>
              <span className="truncate text-muted-foreground text-sm">
                {user.email}
              </span>
            </div>
          </div>
          <div className="divide-y border-t">
            <Row description="Shown across the dashboard." label="Display name">
              <NameEditor initial={user.name ?? ''} />
            </Row>
            <Row
              description="Used to sign in. Cannot be changed."
              label="Email"
            >
              <code className="break-all font-mono text-muted-foreground text-xs">
                {user.email}
              </code>
            </Row>
            <Row
              description="Set during setup or when you accepted an invitation."
              label="Sign-in method"
            >
              <Badge variant="outline">
                <KeyRoundIcon data-icon="inline-start" />
                Email &amp; password
              </Badge>
            </Row>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>How Keenpix looks for you.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row description="Light, dark, or follow your system." label="Theme">
            <ThemeControl />
          </Row>
        </CardContent>
      </Card>
    </div>
  )
}
