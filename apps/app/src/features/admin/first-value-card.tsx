import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { useEffect, useState } from 'react'
import { StatCard } from '@/components/app/stat-card'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getFirstValueFunnelFn } from '@/functions/admin'

dayjs.extend(utc)

type FirstValueFunnel = Awaited<ReturnType<typeof getFirstValueFunnelFn>>

const UNKNOWN = 'Unknown'

// A null funnel or count means nothing was measured, which must stay distinct
// from a measured zero.
export function FirstValueFunnelSummary({
  funnel,
}: {
  funnel: FirstValueFunnel | null
}) {
  const days = funnel?.days ?? []
  const coveredDays = days.filter(
    (day) => day.firstExternalImageWorkspaces !== null,
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle>First value</CardTitle>
        <CardDescription>
          Daily milestone totals for the last 30 complete UTC days, not a cohort
          conversion rate. A workspace reaching a milestone today may have
          signed up on any earlier day.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Signups"
            sub="Ordinary users"
            value={
              funnel
                ? String(days.reduce((sum, day) => sum + day.signups, 0))
                : UNKNOWN
            }
          />
          <StatCard
            label="First project"
            sub="Eligible workspaces"
            value={
              funnel
                ? String(
                    days.reduce(
                      (sum, day) => sum + day.firstProjectWorkspaces,
                      0,
                    ),
                  )
                : UNKNOWN
            }
          />
          <StatCard
            label="First eligible external image"
            sub={`Covered days only: ${coveredDays.length} of ${days.length} days`}
            value={
              coveredDays.length > 0
                ? String(
                    coveredDays.reduce(
                      (sum, day) =>
                        sum + (day.firstExternalImageWorkspaces ?? 0),
                      0,
                    ),
                  )
                : UNKNOWN
            }
          />
        </div>
        {funnel ? (
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>UTC day</TableHead>
                  <TableHead className="text-right">Signups</TableHead>
                  <TableHead className="text-right">First project</TableHead>
                  <TableHead className="text-right">
                    First eligible external image
                  </TableHead>
                  <TableHead className="text-right">
                    Of which pre-existing
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...days].reverse().map((day) => (
                  <TableRow key={day.day}>
                    <TableCell>{day.day}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.signups}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.firstProjectWorkspaces}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.firstExternalImageWorkspaces ?? UNKNOWN}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.preexistingFirstExternalImageWorkspaces ?? UNKNOWN}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
        {funnel ? (
          <p className="text-muted-foreground text-xs">
            {funnel.coverageStartedAt
              ? `Coverage started ${dayjs.utc(funnel.coverageStartedAt).format('MMM D, YYYY HH:mm')} UTC; earlier days and that day are Unknown.`
              : 'Coverage has not started, so first images are Unknown.'}{' '}
            Pre-existing workspaces had a project before coverage, so their real
            first image may be earlier. Edge-only cache hits are not observed.
            {funnel.pendingCandidateEvents > 0
              ? ` ${funnel.pendingCandidateEvents} candidate events are still pending.`
              : ''}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            First value data is unavailable.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function FirstValueCard() {
  const [funnel, setFunnel] = useState<FirstValueFunnel | null>()

  useEffect(() => {
    getFirstValueFunnelFn()
      .then(setFunnel)
      .catch(() => setFunnel(null))
  }, [])

  if (funnel === undefined) {
    return <Skeleton className="h-72" />
  }
  return <FirstValueFunnelSummary funnel={funnel} />
}
