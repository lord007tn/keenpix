import { createFileRoute, redirect } from '@tanstack/react-router'
import { MailIcon, UsersIcon } from 'lucide-react'
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
import { SmtpSettingsPanel } from '@/features/admin/smtp-settings'
import { StaffManagement } from '@/features/admin/staff-management'

// Workspace = instance-wide settings (staff + mailing). These are global, not
// per-project, so they live under the user nav rather than project Settings.
export const Route = createFileRoute('/app/workspace/')({
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'super_admin') {
      throw redirect({ search: { project: undefined }, to: '/app/account' })
    }
  },
  component: WorkspacePage,
})

function WorkspacePage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6 p-6">
      <PageHeader
        actions={<Badge variant="success">Self-hosted</Badge>}
        subtitle="Instance-wide settings shared across every project."
        title="Workspace"
      />

      <Tabs defaultValue="staff">
        <TabsList>
          <TabsTrigger value="staff">
            <UsersIcon data-icon="inline-start" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="email">
            <MailIcon data-icon="inline-start" />
            Email
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
      </Tabs>
    </div>
  )
}
