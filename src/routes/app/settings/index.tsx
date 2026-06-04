import { createFileRoute } from '@tanstack/react-router'
import { ImageIcon, InfoIcon, ShieldIcon } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AllowedHosts } from '@/features/projects/allowed-hosts'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { PipelineSettings } from '@/features/projects/pipeline-settings'
import { appPageHead } from '@/lib/seo'
import { useProject } from '@/stores/project-context'

export const Route = createFileRoute('/app/settings/')({
  head: () =>
    appPageHead(
      'Project settings',
      'Configure Keenpix project origins, image pipeline defaults, and allowed source hosts.',
    ),
  component: SettingsPage,
})

function SettingsPage() {
  const { currentProject, isAll, projects, setProject } = useProject()

  if (isAll) {
    // Settings are per-project. In "All projects" scope, prompt the user to
    // pick or create a project before showing pipeline/security controls.
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

  if (!currentProject) {
    // !isAll should imply a current project, but keep the render path defensive
    // while the project context reconciles a stale ?project= value.
    return null
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <PageHeader
        eyebrow={currentProject.name}
        subtitle="Configuration for this project."
        title="Settings"
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <InfoIcon data-icon="inline-start" />
            General
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <ImageIcon data-icon="inline-start" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="security">
            <ShieldIcon data-icon="inline-start" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent className="pt-6" value="general">
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
        </TabsContent>

        <TabsContent className="pt-6" value="pipeline">
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
        </TabsContent>

        <TabsContent className="pt-6" value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                No API key is required for transform URLs — access to the image
                endpoint is controlled entirely by the allowlist: keenpix only
                transforms images whose source host is listed here.
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
