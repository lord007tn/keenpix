import { Link } from '@tanstack/react-router'
import { TriangleAlertIcon } from 'lucide-react'
import type { getOriginAllowlistWarnings } from '@/actions/analytics/origin-allowlist-warnings'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { compactNumber } from '@/shared/format'

export function OriginAllowlistWarning({
  warnings,
}: {
  warnings: Awaited<ReturnType<typeof getOriginAllowlistWarnings>>
}) {
  if (warnings.length === 0) {
    return null
  }
  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>Some image sources need an allowlist review</AlertTitle>
      <AlertDescription>
        <p>
          These sources have had at least 100 blocked requests each over roughly
          the past day and are missing from their project’s allowed origins. Add
          a source only if you recognize and trust it.
        </p>
        <ul className="mt-3 space-y-3">
          {warnings.map((warning) => (
            <li
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              key={`${warning.projectId}:${warning.host}`}
            >
              <div className="min-w-0">
                <span className="break-all font-medium text-foreground">
                  {warning.host}
                </span>
                <span className="block text-xs">
                  {warning.projectName} ·{' '}
                  {compactNumber(warning.blockedRequests)} blocked requests
                </span>
              </div>
              <Link
                className="shrink-0 self-start text-primary sm:self-auto"
                search={{ project: warning.projectId, section: 'security' }}
                to="/app/settings"
              >
                Review allowed origins
              </Link>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
