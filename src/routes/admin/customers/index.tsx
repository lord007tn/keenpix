import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import { CustomersTable } from '@/features/admin/customers-table'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/customers/')({
  head: () =>
    appPageHead(
      'Customers',
      'Review customer organizations, usage, paid plans, and complimentary access.',
    ),
  component: CustomersAdminPage,
})

function CustomersAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Every customer organization — usage, effective plan, and status. Open one to manage it."
        title="Customers"
      />
      <CustomersTable />
    </div>
  )
}
