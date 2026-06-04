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
import { compactNumber, humanBytes } from '@/shared/format'
import type { DomainBreakdownRow } from '@/shared/types'

export function DomainBreakdown({ rows }: { rows: DomainBreakdownRow[] }) {
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
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Bandwidth saved</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.domain}>
                  <TableCell className="font-medium font-mono text-xs">
                    {r.domain}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {compactNumber(r.requests)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {humanBytes(r.bandwidthSaved, 1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.hitRate.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
