import { createFileRoute, redirect } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { OperationsHealth } from '@/features/admin/operations-health'
import { appPageHead } from '@/shared/seo'

// Operations is instance-wide infrastructure health, so it lives at the top
// level (not under a project scope) and stays gated to super admins.
export const Route = createFileRoute('/app/operations/')({
  head: () =>
    appPageHead(
      'Operations',
      'Keenpix instance operations — disk and memory cache storage and transform queue health.',
    ),
  validateSearch: (search: Record<string, unknown>): { project?: string } => ({
    project: typeof search.project === 'string' ? search.project : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (context.user?.role !== 'super_admin') {
      throw redirect({ search: { project: undefined }, to: '/app/account' })
    }
  },
  component: OperationsPage,
})

function OperationsPage() {
  return (
    <div className="flex max-w-5xl flex-col gap-6 p-6">
      <PageHeader
        actions={<Badge variant="success">Self-hosted</Badge>}
        subtitle="Cache storage and transform-queue pressure for this running instance."
        title="Operations"
      />
      <Card>
        <CardHeader>
          <CardTitle>Operations health</CardTitle>
          <CardDescription>
            Disk and memory cache storage and transform queue pressure for this
            running instance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperationsHealth />
        </CardContent>
      </Card>
    </div>
  )
}
