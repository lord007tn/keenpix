import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  ImageIcon,
  InfoIcon,
  KeyRoundIcon,
  type LucideIcon,
  MailIcon,
  ShieldIcon,
  UsersIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { SettingRow } from '@/components/app/setting-row'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiKeyManagement } from '@/features/admin/api-key-management'
import { SmtpSettingsPanel } from '@/features/admin/smtp-settings'
import { StaffManagement } from '@/features/admin/staff-management'
import { AllowedHosts } from '@/features/projects/allowed-hosts'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { PipelineSettings } from '@/features/projects/pipeline-settings'
import { cn } from '@/lib/cn/utils'
import { appPageHead } from '@/shared/seo'
import { useProject } from '@/stores/project-context'

const SECTIONS = [
  'general',
  'pipeline',
  'security',
  'api-keys',
  'staff',
  'email',
] as const

type Section = (typeof SECTIONS)[number]

function isSection(value: unknown): value is Section {
  return SECTIONS.includes(value as Section)
}

const SECTION_META: Record<Section, { label: string; icon: LucideIcon }> = {
  general: { label: 'General', icon: InfoIcon },
  pipeline: { label: 'Pipeline', icon: ImageIcon },
  security: { label: 'Security', icon: ShieldIcon },
  'api-keys': { label: 'API keys', icon: KeyRoundIcon },
  staff: { label: 'Staff', icon: UsersIcon },
  email: { label: 'Email', icon: MailIcon },
}

// Settings is a single hub: per-project configuration (only when a project is
// selected) plus instance-wide "global" configuration (super admins only).
export const Route = createFileRoute('/app/settings/')({
  head: () =>
    appPageHead(
      'Settings',
      'Configure Keenpix project origins, image pipeline, allowed hosts, plus instance API keys, staff, and email.',
    ),
  validateSearch: (
    search: Record<string, unknown>,
  ): { project?: string; section?: Section } => ({
    project: typeof search.project === 'string' ? search.project : undefined,
    section: isSection(search.section) ? search.section : undefined,
  }),
  component: SettingsPage,
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

function SubNavGroup({ label }: { label: string }) {
  return (
    <div className="px-2.5 pt-3 pb-1 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
      {label}
    </div>
  )
}

function SettingsPage() {
  const { currentProject, isAll, projects, setProject } = useProject()
  const { user } = useRouteContext({ from: '/app' })
  const { section } = Route.useSearch()
  const navigate = Route.useNavigate()
  const isSuperAdmin = user.role === 'super_admin'

  const projectSections: Section[] = currentProject
    ? ['general', 'pipeline', 'security']
    : []
  const globalSections: Section[] = isSuperAdmin
    ? ['api-keys', 'staff', 'email']
    : []
  const available = [...projectSections, ...globalSections]
  const active = section && available.includes(section) ? section : available[0]

  function goTo(next: Section) {
    navigate({ search: (prev) => ({ ...prev, section: next }) })
  }

  // No project selected and no instance access: there is nothing to configure
  // until a project is picked or created.
  if (!active) {
    return (
      <div className="flex max-w-4xl flex-col gap-6 p-6">
        <PageHeader
          eyebrow="All projects"
          subtitle="Per-project configuration."
          title="Settings"
        />
        <Card>
          <CardHeader>
            <CardTitle>Select a project</CardTitle>
            <CardDescription>
              Settings apply to a single project. Choose one to configure its
              origin, allowlist, and pipeline.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {projects.length === 0 ? (
              <NewProjectDialog />
            ) : (
              projects.map((p) => (
                <button
                  className="flex items-center gap-3 rounded-md border p-3 text-left transition-colors hover:border-ring/60 hover:bg-accent"
                  key={p.id}
                  onClick={() => setProject(p.id)}
                  type="button"
                >
                  <span
                    className="size-8 shrink-0 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, ${p.color1}, ${p.color2})`,
                    }}
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium text-sm">
                      {p.name}
                    </span>
                    <span className="truncate font-mono text-muted-foreground text-xs">
                      {p.origin}
                    </span>
                  </span>
                  <Badge
                    className="ml-auto"
                    variant={p.env === 'production' ? 'success' : 'warning'}
                  >
                    {p.env}
                  </Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        eyebrow={isAll ? 'Workspace' : currentProject?.name}
        subtitle="Project and instance configuration."
        title="Settings"
      />

      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="flex flex-col gap-0.5">
            {projectSections.length > 0 ? (
              <>
                <SubNavGroup label={currentProject?.name ?? 'Project'} />
                {projectSections.map((s) => (
                  <SubNavItem
                    active={active === s}
                    key={s}
                    onClick={() => goTo(s)}
                    section={s}
                  />
                ))}
              </>
            ) : null}
            {globalSections.length > 0 ? (
              <>
                <SubNavGroup label="Global" />
                {globalSections.map((s) => (
                  <SubNavItem
                    active={active === s}
                    key={s}
                    onClick={() => goTo(s)}
                    section={s}
                  />
                ))}
                {isAll ? (
                  <p className="px-2.5 pt-2 text-muted-foreground text-xs">
                    Select a project (top bar) to edit its origin, pipeline, and
                    allowlist.
                  </p>
                ) : null}
              </>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0">
          {active === 'general' && currentProject ? (
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>
                  Identifiers and origin for this project.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <SettingRow
                  className="py-4 first:pt-0 last:pb-0 sm:items-start"
                  description="Use this in your transform URLs: /img/<source-url>?project=<id>"
                  label="Project ID"
                >
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {currentProject.id}
                    </code>
                    <Button
                      onClick={() => {
                        navigator.clipboard?.writeText(currentProject.id)
                        toast.success('Project ID copied')
                      }}
                      size="sm"
                      variant="outline"
                    >
                      Copy
                    </Button>
                  </div>
                </SettingRow>
                <SettingRow
                  className="py-4 first:pt-0 last:pb-0 sm:items-start"
                  description="The project's display name."
                  label="Project name"
                >
                  <span className="text-sm sm:text-right">
                    {currentProject.name}
                  </span>
                </SettingRow>
                <SettingRow
                  className="py-4 first:pt-0 last:pb-0 sm:items-start"
                  description="Where keenpix fetches originals from."
                  label="Origin"
                >
                  <code className="break-all font-mono text-muted-foreground text-xs">
                    {currentProject.origin}
                  </code>
                </SettingRow>
              </CardContent>
            </Card>
          ) : null}

          {active === 'pipeline' && currentProject ? (
            <Card>
              <CardHeader>
                <CardTitle>Pipeline</CardTitle>
                <CardDescription>
                  Defaults applied when a transform request omits the matching
                  parameter. Toggles save automatically; Default quality applies
                  when you click Save.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PipelineSettings project={currentProject} />
              </CardContent>
            </Card>
          ) : null}

          {active === 'security' && currentProject ? (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  No API key is required for transform URLs — access to the
                  image endpoint is controlled entirely by the allowlist:
                  keenpix only transforms images whose source host is listed
                  here.
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                <SettingRow
                  className="py-4 first:pt-0 last:pb-0 sm:items-start"
                  description="keenpix only fetches from origins on this list. An empty list blocks every request."
                  label="Allowed hosts"
                >
                  <AllowedHosts
                    initial={currentProject.allowedOrigins ?? []}
                    key={currentProject.id}
                    projectId={currentProject.id}
                  />
                </SettingRow>
              </CardContent>
            </Card>
          ) : null}

          {active === 'api-keys' ? (
            <Card>
              <CardHeader>
                <CardTitle>Internal API keys</CardTitle>
                <CardDescription>
                  Credentials for trusted backend integrations. These are not
                  used by the public image transform endpoint.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyManagement />
              </CardContent>
            </Card>
          ) : null}

          {active === 'staff' ? (
            <Card>
              <CardHeader>
                <CardTitle>Staff &amp; invitations</CardTitle>
                <CardDescription>
                  Invite teammates and review who can access this workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StaffManagement />
              </CardContent>
            </Card>
          ) : null}

          {active === 'email' ? (
            <Card>
              <CardHeader>
                <CardTitle>SMTP connection</CardTitle>
                <CardDescription>
                  Credentials used when staff invitations are emailed. Save your
                  changes, then send a test to confirm delivery.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SmtpSettingsPanel />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
