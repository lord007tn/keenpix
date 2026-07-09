import { createFileRoute } from '@tanstack/react-router'
import { CustomerDetail } from '@/features/admin/customer-detail'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/customers/$orgId/')({
  head: () =>
    appPageHead(
      'Customer',
      'Manage a customer organization, plan, and access.',
    ),
  component: CustomerDetailPage,
})

function CustomerDetailPage() {
  const { orgId } = Route.useParams()
  return <CustomerDetail orgId={orgId} />
}
