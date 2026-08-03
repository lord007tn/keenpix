import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { PlatformSettings } from '@/features/admin/platform-settings'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/settings/')({
  head: () =>
    appPageHead(
      'Settings',
      'Deployment, cache, and CDN configuration for this instance.',
    ),
  component: SettingsAdminPage,
})

function SettingsAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Configure financial assumptions and review the effective deployment, cache, and CDN settings."
        title="Settings"
      />
      <PlatformSettings />
    </div>
  )
}
