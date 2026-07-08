import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  ActivityIcon,
  CloudIcon,
  type LucideIcon,
  ServerIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ClientManagement } from '@/features/admin/client-management'
import { CloudflareSettingsPanel } from '@/features/admin/cloudflare-settings'
import { OperationsConfig } from '@/features/admin/operations-config'
import { OperationsHealth } from '@/features/admin/operations-health'
import { cn } from '@/lib/cn/utils'

const SECTIONS = ['clients', 'operations', 'cdn'] as const
type Section = (typeof SECTIONS)[number]

function isSection(value: unknown): value is Section {
  return SECTIONS.includes(value as Section)
}

const SECTION_META: Record<Section, { label: string; icon: LucideIcon }> = {
  clients: { label: 'Clients', icon: UsersRoundIcon },
  operations: { label: 'Operations', icon: ActivityIcon },
  cdn: { label: 'CDN cache', icon: CloudIcon },
}

// Operator / platform-admin console: instance-wide operations, health, and the
// global Cloudflare CDN settings. Email is configured entirely via environment
// (EMAIL_PROVIDER + provider vars), so it has no panel here. Operations config is
// self-host-only (platform-managed in cloud); the CDN cache / Cloudflare edge
// integration stays available to the super-admin in both modes. The server
// guards enforce this split. Super-admin access is guarded by the /admin layout.
export const Route = createFileRoute('/admin/')({
  validateSearch: (search: Record<string, unknown>): { section?: Section } => ({
    section: isSection(search.section) ? search.section : undefined,
  }),
  component: AdminPage,
})

function SubNavItem({
  active,
  onClick,
  section,
}: {
  active: boolean
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
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className={cn('size-4', active && 'text-primary')} />
      {label}
    </button>
  )
}

function AdminPage() {
  const { cloud } = useRouteContext({ from: '/admin' })
  const { section } = Route.useSearch()
  const navigate = Route.useNavigate()

  // Both sections are available in cloud and self-host; the per-tenant-affecting
  // operations config *inside* the Operations section is the only self-host-only
  // piece and is gated below. `cloud` is still read for that gating.
  const available: Section[] = [...SECTIONS]
  const active = section && available.includes(section) ? section : available[0]

  function goTo(next: Section) {
    navigate({ search: (prev) => ({ ...prev, section: next }) })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        actions={<Badge variant="success">Operator</Badge>}
        subtitle="Instance operations, health, and global settings for this deployment."
        title="Admin"
      />

      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="flex flex-col gap-0.5">
            {available.map((s) => (
              <SubNavItem
                active={active === s}
                key={s}
                onClick={() => goTo(s)}
                section={s}
              />
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {active === 'clients' ? (
            <Card>
              <CardHeader>
                <CardTitle>Clients</CardTitle>
                <CardDescription>
                  Review client organizations, aggregate usage, and internal
                  plan grants.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientManagement />
              </CardContent>
            </Card>
          ) : null}

          {active === 'operations' ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Operations health</CardTitle>
                  <CardDescription>
                    Disk and memory cache storage and transform queue pressure
                    for this running instance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OperationsHealth />
                </CardContent>
              </Card>
              {cloud ? null : (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <span className="flex items-center gap-2">
                        <ServerIcon className="size-4 text-muted-foreground" />
                        Operations configuration
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Instance-wide cache and transform limits. Cache caps apply
                      to this running instance immediately; concurrency and
                      queue depth are environment-configured.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OperationsConfig />
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}

          {active === 'cdn' ? (
            <Card>
              <CardHeader>
                <CardTitle>Cloudflare edge analytics</CardTitle>
                <CardDescription>
                  Wire a Cloudflare API token so keenpix can show real edge
                  cache hit-rate alongside its origin-shield figures. Edge hits
                  are served before the origin, so they never reach keenpix on
                  their own.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CloudflareSettingsPanel />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
