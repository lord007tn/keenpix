import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CreditCardIcon,
  KeyRoundIcon,
  type LucideIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { SettingRow } from '@/components/app/setting-row'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteAccount } from '@/features/account/delete-account'
import { EmailEditor } from '@/features/account/email-editor'
import { NameEditor } from '@/features/account/name-editor'
import { PasswordEditor } from '@/features/account/password-editor'
import { SessionsList } from '@/features/account/sessions-list'
import { SetPasswordEditor } from '@/features/account/set-password-editor'
import { ThemeControl } from '@/features/account/theme-control'
import { BillingPanel } from '@/features/billing/billing-panel'
import { cn } from '@/lib/cn/utils'
import { appPageHead } from '@/shared/seo'

const ALL_SECTIONS = [
  'profile',
  'security',
  'preferences',
  'billing',
  'danger',
] as const
type Section = (typeof ALL_SECTIONS)[number]

function isSection(value: unknown): value is Section {
  return ALL_SECTIONS.includes(value as Section)
}

const SECTION_META: Record<Section, { label: string; icon: LucideIcon }> = {
  profile: { label: 'Profile', icon: UserIcon },
  security: { label: 'Security', icon: ShieldIcon },
  preferences: { label: 'Preferences', icon: SlidersHorizontalIcon },
  billing: { label: 'Plan & billing', icon: CreditCardIcon },
  danger: { label: 'Danger zone', icon: TriangleAlertIcon },
}

export const Route = createFileRoute('/app/account/')({
  validateSearch: (search: Record<string, unknown>): { section?: Section } => ({
    section: isSection(search.section) ? search.section : undefined,
  }),
  head: () =>
    appPageHead(
      'Account',
      'Manage your Keenpix profile, sign-in email and password, active sessions, and personal preferences.',
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

function joinedLabel(iso: string | null): string | null {
  if (!iso) {
    return null
  }
  const date = dayjs(iso)
  if (!date.isValid()) {
    return null
  }
  return date.format('MMMM D, YYYY')
}

function SubNavItem({
  active,
  danger,
  onClick,
  section,
}: {
  active: boolean
  danger?: boolean
  onClick: () => void
  section: Section
}) {
  const { label, icon: Icon } = SECTION_META[section]
  return (
    <button
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left font-medium text-sm transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        danger && !active && 'text-destructive/80 hover:text-destructive',
      )}
      onClick={onClick}
      type="button"
    >
      <Icon
        className={cn(
          'size-4',
          active && (danger ? 'text-destructive' : 'text-primary'),
        )}
      />
      {label}
    </button>
  )
}

function SubNavGroup({ label }: { label: string }) {
  return (
    <div className="px-2.5 pt-3 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
      {label}
    </div>
  )
}

function AccountPage() {
  const { user, cloud } = useRouteContext({ from: '/app' })
  const { section } = Route.useSearch()
  const navigate = Route.useNavigate()
  const display = user.name?.trim() || user.email
  const joined = joinedLabel(user.createdAt)
  const signInMethods = [
    ...(user.hasPassword ? ['Password'] : []),
    ...user.providers.map((provider) =>
      provider === 'google'
        ? 'Google'
        : provider.charAt(0).toUpperCase() + provider.slice(1),
    ),
  ]

  // Billing + account deletion are cloud-only surfaces (self-host is unlimited
  // and its accounts are operator-managed).
  const available: Section[] = cloud
    ? [...ALL_SECTIONS]
    : ['profile', 'security', 'preferences']
  const active = section && available.includes(section) ? section : 'profile'

  function goTo(next: Section) {
    navigate({ search: { section: next } })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        subtitle="Your profile, sign-in, and personal preferences."
        title="Account"
      />

      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="flex flex-col gap-0.5">
            <SubNavGroup label="Account" />
            <SubNavItem
              active={active === 'profile'}
              onClick={() => goTo('profile')}
              section="profile"
            />
            <SubNavItem
              active={active === 'preferences'}
              onClick={() => goTo('preferences')}
              section="preferences"
            />
            <SubNavGroup label="Sign-in & security" />
            <SubNavItem
              active={active === 'security'}
              onClick={() => goTo('security')}
              section="security"
            />
            {cloud ? (
              <SubNavItem
                active={active === 'danger'}
                danger
                onClick={() => goTo('danger')}
                section="danger"
              />
            ) : null}
            {cloud ? (
              <>
                <SubNavGroup label="Billing" />
                <SubNavItem
                  active={active === 'billing'}
                  onClick={() => goTo('billing')}
                  section="billing"
                />
              </>
            ) : null}
          </nav>
        </aside>

        <div className="flex min-w-0 max-w-3xl flex-col gap-6">
          {active === 'profile' ? (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  How you appear across the workspace, and your sign-in email.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <Avatar size="lg">
                    {user.image ? <AvatarImage src={user.image} /> : null}
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
                    className="px-3 py-3 sm:items-start"
                    description="Used to sign in."
                    label="Email"
                  >
                    <EmailEditor
                      cloud={cloud}
                      email={user.email}
                      verified={user.emailVerified}
                    />
                  </SettingRow>
                  <SettingRow
                    className="px-3 py-3 sm:items-center"
                    description="How you authenticate."
                    label="Sign-in method"
                  >
                    <Badge variant="outline">
                      <KeyRoundIcon data-icon="inline-start" />
                      {signInMethods.join(' + ') || 'Email'}
                    </Badge>
                  </SettingRow>
                  {joined ? (
                    <SettingRow
                      className="px-3 py-3 sm:items-center"
                      description="When this account was created."
                      label="Member since"
                    >
                      <span className="text-muted-foreground text-sm">
                        {joined}
                      </span>
                    </SettingRow>
                  ) : null}
                  <SettingRow
                    className="px-3 py-3 sm:items-center"
                    description="Reference this if you contact support."
                    label="User ID"
                  >
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {user.id}
                      </code>
                      <Button
                        onClick={() => {
                          navigator.clipboard?.writeText(user.id)
                          toast.success('User ID copied')
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Copy
                      </Button>
                    </div>
                  </SettingRow>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {active === 'security' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {user.hasPassword ? 'Password' : 'Add a password'}
                  </CardTitle>
                  <CardDescription>
                    {user.hasPassword
                      ? 'Change your password. You’ll need your current one.'
                      : 'Add password sign-in alongside your linked provider.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {user.hasPassword ? (
                    <PasswordEditor />
                  ) : (
                    <SetPasswordEditor />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Active sessions</CardTitle>
                  <CardDescription>
                    Devices currently signed in to your account. Sign out any
                    you don’t recognize.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SessionsList />
                </CardContent>
              </Card>
            </>
          ) : null}

          {active === 'preferences' ? (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                  Personal settings for this browser.
                </CardDescription>
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
          ) : null}

          {active === 'billing' && cloud ? <BillingPanel /> : null}

          {active === 'danger' && cloud ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive">
                  Delete account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and any workspace you solely
                  own. Cancel active subscriptions or transfer workspace
                  ownership first. This cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteAccount email={user.email} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
