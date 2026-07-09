import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/app/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiKeyManagement } from '@/features/admin/api-key-management'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/api-keys/')({
  head: () =>
    appPageHead(
      'API keys',
      'Internal API keys for trusted backend integrations against the Keenpix JSON API.',
    ),
  component: ApiKeysAdminPage,
})

function ApiKeysAdminPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Credentials for trusted backend integrations — not the public image transform endpoint."
        title="API keys"
      />
      <Card>
        <CardHeader>
          <CardTitle>Internal API keys</CardTitle>
          <CardDescription>
            Manage keys and review recent API activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeyManagement />
        </CardContent>
      </Card>
    </div>
  )
}
