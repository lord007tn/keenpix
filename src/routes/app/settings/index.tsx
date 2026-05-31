import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MailingPanel, SmtpSettingsPanel } from '@/features/admin/smtp-settings'
import { StaffManagement } from '@/features/admin/staff-management'
import { AllowedHosts } from '@/features/projects/allowed-hosts'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { PipelineSettings } from '@/features/projects/pipeline-settings'
import { useProject } from '@/stores/project-context'

export const Route = createFileRoute('/app/settings/')({
  component: SettingsPage,
})

function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
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

function SettingsPage() {
  const { currentProject, isAll, projects, setProject } = useProject()
  const { user } = useRouteContext({ from: '/app' })
  const isSuperAdmin = user.role === 'super_admin'
  const workspaceAdmin = isSuperAdmin ? (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>
            Invite teammates and configure how staff invitations are emailed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <StaffManagement />
          <div className="flex flex-col gap-4 border-t pt-6">
            <div>
              <h3 className="font-medium text-sm">Invitation email delivery</h3>
              <p className="text-muted-foreground text-xs">
                SMTP credentials only affect staff invite emails.
              </p>
            </div>
            <SmtpSettingsPanel />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mailing</CardTitle>
          <CardDescription>
            Check the active sender and send a test message before inviting
            staff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MailingPanel />
        </CardContent>
      </Card>
    </>
  ) : null

  // Settings are per-project. In "All projects" scope there's nothing to
  // configure — prompt the user to pick a project (or create one).
  if (isAll) {
    return (
      <div className="flex max-w-4xl flex-col gap-6 p-6">
        <PageHeader subtitle="Per-project configuration." title="Settings" />
        {workspaceAdmin}
        <Card>
          <CardHeader>
            <CardTitle>Pick a project</CardTitle>
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

  // `!isAll` guarantees a current project, but narrow it for the type-checker.
  if (!currentProject) {
    return null
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <PageHeader
        eyebrow={currentProject.name}
        subtitle="Per-project configuration."
        title="Settings"
      />

      {workspaceAdmin}

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            description="Use this in your transform URLs: /api/keenpix?project=<id>&url=…"
            label="Project ID"
          >
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                {currentProject?.id ?? '—'}
              </code>
              <Button
                onClick={() => {
                  if (currentProject?.id) {
                    navigator.clipboard?.writeText(currentProject.id)
                    toast.success('Project ID copied')
                  }
                }}
                size="sm"
                variant="outline"
              >
                Copy
              </Button>
            </div>
          </SettingRow>
          <SettingRow
            description="The project's display name."
            label="Project name"
          >
            <span className="text-sm sm:text-right">
              {currentProject?.name ?? '—'}
            </span>
          </SettingRow>
          <SettingRow
            description="Where keenpix fetches originals from."
            label="Origin"
          >
            <code className="break-all font-mono text-muted-foreground text-xs">
              {currentProject?.origin ?? '—'}
            </code>
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>
            Defaults applied when a transform request omits the matching
            parameter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineSettings project={currentProject} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Access is controlled entirely by the allowlist: keenpix only
            transforms images whose source host is listed here. No API keys to
            manage or leak.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            description="keenpix only fetches from origins on this list. An empty list blocks every request."
            label="Allowed hosts"
          >
            <AllowedHosts
              initial={currentProject?.allowedOrigins ?? []}
              key={currentProject?.id}
              projectId={currentProject?.id ?? ''}
            />
          </SettingRow>
        </CardContent>
      </Card>
    </div>
  )
}
