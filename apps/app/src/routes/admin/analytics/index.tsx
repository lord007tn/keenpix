import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { PlatformAnalyticsView } from '@/features/admin/platform-analytics-view'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/analytics/')({
  head: () =>
    appPageHead(
      'Platform analytics',
      'Aggregated cross-tenant traffic, cache performance, and plan distribution.',
    ),
  component: AnalyticsAdminPage,
})

function AnalyticsAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Aggregated traffic and cache performance across every customer."
        title="Platform analytics"
      />
      <PlatformAnalyticsView />
    </div>
  )
}
