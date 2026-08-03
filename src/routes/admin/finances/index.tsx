import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { PlatformFinances } from '@/features/admin/platform-finances'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/finances/')({
  head: () =>
    appPageHead(
      'Finances',
      'Platform revenue, operating costs, profit, and delivery economics.',
    ),
  component: FinancesAdminPage,
})

function FinancesAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Actual revenue reconciled against the configured operating-cost model."
        title="Finances"
      />
      <PlatformFinances />
    </div>
  )
}
