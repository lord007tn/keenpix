import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import {
  CreditCardIcon,
  ImageIcon,
  InfoIcon,
  KeyRoundIcon,
  type LucideIcon,
  ShieldIcon,
  UsersRoundIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiKeyManagement } from '@/features/api-keys/api-key-management'
import { BillingPanel } from '@/features/billing/billing-panel'
import { AllowedHosts } from '@/features/projects/allowed-hosts'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { PipelineSettings } from '@/features/projects/pipeline-settings'
import { ProjectGeneral } from '@/features/projects/project-general'
import { SignedUrls } from '@/features/projects/signed-urls'
import { TeamManagement } from '@/features/team/team-management'
import { cn } from '@/lib/cn/utils'
import { appPageHead } from '@/shared/seo'
import { useProject } from '@/stores/project-context'

// Operator config (customers, operations, staff, CDN) lives in the standalone
// Admin console (/admin), not here — Settings is per-project config plus per-org
// billing, team, and API keys.
const SECTIONS = [
  'general',
  'pipeline',
  'security',
  'billing',
  'team',
  'api-keys',
] as const

type Section = (typeof SECTIONS)[number]

function isSection(value: unknown): value is Section {
  return SECTIONS.includes(value as Section)
}

const SECTION_META: Record<Section, { label: string; icon: LucideIcon }> = {
  general: { label: 'General', icon: InfoIcon },
  pipeline: { label: 'Pipeline', icon: ImageIcon },
  security: { label: 'Security', icon: ShieldIcon },
  billing: { label: 'Plan & billing', icon: CreditCardIcon },
  team: { label: 'Team', icon: UsersRoundIcon },
  'api-keys': { label: 'API keys', icon: KeyRoundIcon },
}

// Settings is a single hub: per-project configuration (only when a project is
// selected) plus instance-wide "global" configuration (super admins only).
export const Route = createFileRoute('/app/settings/')({
  head: () =>
    appPageHead(
      'Settings',
      'Configure Keenpix project origins, image pipeline, allowed hosts, plus your plan and team.',
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
  const { cloud, orgRole, productAccess } = useRouteContext({ from: '/app' })
  const { section } = Route.useSearch()
  const navigate = Route.useNavigate()
  // Owner/admin may edit/delete projects; members get read-only (server enforces).
  const canManageProject = !cloud || orgRole === 'owner' || orgRole === 'admin'

  const projectSections: Section[] =
    currentProject && productAccess ? ['general', 'pipeline', 'security'] : []
  if (currentProject && productAccess && canManageProject) {
    projectSections.push('api-keys')
  }
  // Billing + Team are per-org and cloud-only (self-host is single-tenant/free),
  // shown to every member of the org. API keys are the org's JSON-API credentials
  // (both modes), managed by owners/admins. Operator-only config (staff, ops, CDN)
  // lives in the Admin console.
  const billingSections: Section[] = cloud ? ['billing'] : []
  const teamSections: Section[] = cloud ? ['team'] : []
  // Cloud credentials belong to one selected project. Self-host retains the
  // legacy organization-wide key surface when no project is selected.
  const apiKeySections: Section[] =
    !cloud && productAccess && canManageProject && !currentProject
      ? ['api-keys']
      : []
  const available = [
    ...projectSections,
    ...billingSections,
    ...teamSections,
    ...apiKeySections,
  ]
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
        subtitle="Project and organization configuration."
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
            {billingSections.length > 0 ? (
              <>
                <SubNavGroup label="Billing" />
                {billingSections.map((s) => (
                  <SubNavItem
                    active={active === s}
                    key={s}
                    onClick={() => goTo(s)}
                    section={s}
                  />
                ))}
              </>
            ) : null}
            {teamSections.length > 0 ? (
              <>
                <SubNavGroup label="Organization" />
                {teamSections.map((s) => (
                  <SubNavItem
                    active={active === s}
                    key={s}
                    onClick={() => goTo(s)}
                    section={s}
                  />
                ))}
              </>
            ) : null}
            {apiKeySections.length > 0 ? (
              <>
                <SubNavGroup label="Developers" />
                {apiKeySections.map((s) => (
                  <SubNavItem
                    active={active === s}
                    key={s}
                    onClick={() => goTo(s)}
                    section={s}
                  />
                ))}
              </>
            ) : null}
          </nav>
        </aside>

        <div className="min-w-0">
          {active === 'general' && currentProject ? (
            <ProjectGeneral
              canManage={canManageProject}
              key={currentProject.id}
              project={currentProject}
            />
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
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Allowed hosts</CardTitle>
                  <CardDescription>
                    keenpix only fetches from origins on this list — an empty
                    list blocks every request, and no API key is needed for
                    transform URLs. Per-host figures cover the last 30 days.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AllowedHosts
                    initial={currentProject.allowedOrigins ?? []}
                    key={currentProject.id}
                    projectId={currentProject.id}
                  />
                </CardContent>
              </Card>
              {canManageProject ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Signed URLs</CardTitle>
                    <CardDescription>
                      Optional hotlink protection on top of the allowlist:
                      require an HMAC signature on every transform URL so third
                      parties can’t run up your bandwidth with cache-busting
                      requests.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SignedUrls
                      key={currentProject.id}
                      projectId={currentProject.id}
                    />
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : null}

          {active === 'billing' ? <BillingPanel /> : null}

          {active === 'team' ? (
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
                <CardDescription>
                  Invite teammates to this organization and manage their roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamManagement />
              </CardContent>
            </Card>
          ) : null}

          {active === 'api-keys' ? (
            <Card>
              <CardHeader>
                <CardTitle>API keys</CardTitle>
                <CardDescription>
                  {currentProject
                    ? `Credentials scoped to ${currentProject.name}.`
                    : 'Credentials for managing projects, domains, and pipeline over the JSON API.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyManagement
                  key={currentProject?.id ?? 'organization'}
                  projectId={currentProject?.id}
                  projectName={currentProject?.name}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
