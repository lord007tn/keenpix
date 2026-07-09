import { createFileRoute } from '@tanstack/react-router'
import { ServerIcon } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { OperationsConfig } from '@/features/admin/operations-config'
import { OperationsHealth } from '@/features/admin/operations-health'
import { appPageHead } from '@/shared/seo'

export const Route = createFileRoute('/admin/operations/')({
  head: () =>
    appPageHead(
      'Operations',
      'Cache storage, transform queue pressure, and instance limits for this deployment.',
    ),
  component: OperationsAdminPage,
})

function OperationsAdminPage() {
  const { cloud } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PageHeader
        subtitle="Cache storage, transform queue pressure, and instance limits for this running instance."
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
          <OperationsHealth cloud={cloud} />
        </CardContent>
      </Card>

      {cloud ? null : (
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <ServerIcon className="size-4 text-muted-foreground" />
                Operations configuration
              </span>
            </CardTitle>
            <CardDescription>
              Instance-wide cache caps applied to this running instance
              immediately; concurrency and queue depth are
              environment-configured.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OperationsConfig />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
