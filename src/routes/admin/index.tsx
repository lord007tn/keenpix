import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { Badge } from '@/components/ui/badge'
import { PlatformOverview } from '@/features/admin/platform-overview'

export const Route = createFileRoute('/admin/')({
  component: AdminOverviewPage,
})

function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        actions={<Badge variant="success">Operator</Badge>}
        subtitle="Platform health at a glance — customers, traffic, and plan mix across every tenant."
        title="Overview"
      />
      <PlatformOverview />
    </div>
  )
}
