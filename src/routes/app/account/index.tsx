import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { KeyRoundIcon } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { SettingRow } from '@/components/app/setting-row'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { NameEditor } from '@/features/account/name-editor'
import { ThemeControl } from '@/features/account/theme-control'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/app/account/')({
  head: () =>
    appPageHead(
      'Account',
      'Manage your Keenpix profile, display name, sign-in details, and appearance preferences.',
    ),
  component: AccountPage,
})

const NAME_SPLIT_RE = /[\s@._-]+/

function initials(base: string): string {
  const parts = base.trim().split(NAME_SPLIT_RE).filter(Boolean)
  const first = parts[0]?.[0] ?? base[0] ?? '?'
  const second = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : ''
  return (first + second).toUpperCase()
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
          <div className="mt-2 divide-y rounded-md border">
            <SettingRow
              className="px-3 py-3 sm:items-center"
              description="Shown across the dashboard."
              label="Display name"
            >
              <NameEditor initial={user.name ?? ''} />
            </SettingRow>
            <SettingRow
              className="px-3 py-3 sm:items-center"
              description="Used to sign in. Cannot be changed."
              label="Email"
            >
              <code className="break-all font-mono text-muted-foreground text-xs">
                {user.email}
              </code>
            </SettingRow>
            <SettingRow
              className="px-3 py-3 sm:items-center"
              description="Set during setup or when you accepted an invitation."
              label="Sign-in method"
            >
              <Badge variant="outline">
                <KeyRoundIcon data-icon="inline-start" />
                Email &amp; password
              </Badge>
            </SettingRow>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>How Keenpix looks for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            <SettingRow
              className="px-3 py-3 sm:items-center"
              description="Light, dark, or follow your system."
              label="Theme"
            >
              <ThemeControl />
            </SettingRow>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
