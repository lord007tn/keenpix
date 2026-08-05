import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StaffManagement } from '@/features/admin/staff-management'
import { appPageHead } from '@/shared/seo'

// Self-host operator flow only: staff invites add a user to the single shared
// org. Cloud team management is org-scoped (the tenant Team section), so this
// page is redirected away in cloud.
export const Route = createFileRoute('/admin/staff/')({
  beforeLoad: ({ context }) => {
    if (context.cloud) {
      throw redirect({ to: '/admin' })
    }
  },
  head: () =>
    appPageHead(
      'Staff',
      'Invite operators and review who can access this self-hosted workspace.',
    ),
  component: StaffAdminPage,
})

function StaffAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Invite operators and review who can access this workspace."
        title="Staff"
      />
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
    </div>
  )
}
