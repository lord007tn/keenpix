import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/cn/utils'
import { compactNumber, humanBytes } from '@/shared/format'
import type { DomainBreakdownRow } from '@/shared/types'

function latencyTone(ms: number): string {
  if (ms === 0) {
    return 'text-muted-foreground'
  }
  if (ms < 30) {
    return 'text-success-text'
  }
  if (ms < 100) {
    return ''
  }
  return 'text-warning-text'
}

export function DomainBreakdown({ rows }: { rows: DomainBreakdownRow[] }) {
  const total = rows.reduce((sum, r) => sum + r.requests, 0)
  const max = Math.max(...rows.map((r) => r.requests), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>By source domain</CardTitle>
        <CardDescription>
          Per-allowed-domain totals this window for the selected project.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-muted-foreground text-sm">
            No requests in this window yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead className="w-[30%]">Share</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Avg latency</TableHead>
                <TableHead className="text-right">Bandwidth saved</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Last seen
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const share = total === 0 ? 0 : (r.requests / total) * 100
                return (
                  <TableRow key={r.domain}>
                    <TableCell className="font-medium font-mono text-xs">
                      {r.domain}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${(r.requests / max) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-muted-foreground text-xs tabular-nums">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {compactNumber(r.requests)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        latencyTone(r.avgLatency),
                      )}
                    >
                      {r.avgLatency}ms
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {humanBytes(r.bandwidthSaved, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.hitRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="hidden text-right text-muted-foreground text-xs tabular-nums lg:table-cell">
                      {r.lastSeen ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
