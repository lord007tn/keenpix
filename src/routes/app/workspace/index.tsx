import { createFileRoute, redirect } from '@tanstack/react-router'
import { KeyRoundIcon, MailIcon, UsersIcon } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApiKeyManagement } from '@/features/admin/api-key-management'
import { SmtpSettingsPanel } from '@/features/admin/smtp-settings'
import { StaffManagement } from '@/features/admin/staff-management'
import { appPageHead } from '@/lib/seo'

const WORKSPACE_TABS = ['staff', 'email', 'api-keys'] as const

type WorkspaceTab = (typeof WORKSPACE_TABS)[number]

function isWorkspaceTab(value: unknown): value is WorkspaceTab {
  return value === 'staff' || value === 'email' || value === 'api-keys'
}

// Workspace = instance-wide settings (staff + mailing). These are global, not
// per-project, so they live under the user nav rather than project Settings.
export const Route = createFileRoute('/app/workspace/')({
  head: () =>
    appPageHead(
      'Workspace',
      'Manage Keenpix staff, SMTP settings, and internal API keys for trusted integrations.',
    ),
  validateSearch: (search: Record<string, unknown>): { tab: WorkspaceTab } => ({
    tab: isWorkspaceTab(search.tab) ? search.tab : 'staff',
  }),
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'super_admin') {
      throw redirect({ search: { project: undefined }, to: '/app/account' })
    }
  },
  component: WorkspacePage,
})

function WorkspacePage() {
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <PageHeader
        actions={<Badge variant="success">Self-hosted</Badge>}
        subtitle="Instance-wide settings shared across every project."
        title="Workspace"
      />

      <Tabs
        onValueChange={(value) => {
          if (isWorkspaceTab(value)) {
            navigate({ search: (prev) => ({ ...prev, tab: value }) })
          }
        }}
        value={tab}
      >
        <TabsList>
          <TabsTrigger value="staff">
            <UsersIcon data-icon="inline-start" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="email">
            <MailIcon data-icon="inline-start" />
            Email
          </TabsTrigger>
          <TabsTrigger value="api-keys">
            <KeyRoundIcon data-icon="inline-start" />
            API Keys
          </TabsTrigger>
        </TabsList>

        <TabsContent className="pt-6" value="staff">
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
        </TabsContent>

        <TabsContent className="pt-6" value="email">
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
        </TabsContent>

        <TabsContent className="pt-6" value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>Internal API keys</CardTitle>
              <CardDescription>
                Credentials for trusted backend integrations. These are not used
                by the public image transform endpoint.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyManagement />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
