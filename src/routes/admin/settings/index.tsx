import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { CdnSettings } from '@/features/admin/cdn-settings'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/settings/')({
  head: () =>
    appPageHead(
      'Settings',
      'CDN and cache configuration for this deployment (environment-driven).',
    ),
  component: SettingsAdminPage,
})

function SettingsAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="CDN and cache configuration for this deployment. All values are set via environment variables."
        title="Settings"
      />
      <CdnSettings />
    </div>
  )
}
