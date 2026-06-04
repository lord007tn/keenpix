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
import type { ProjectBreakdownRow } from '@/shared/types'

export function ProjectBreakdown({
  rows,
  onPick,
}: {
  rows: ProjectBreakdownRow[]
  onPick: (id: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>By project</CardTitle>
        <CardDescription>
          Per-project totals this window — select a row to drill in.
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
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Bandwidth saved</TableHead>
                <TableHead className="text-right">Hit rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  className="cursor-pointer"
                  key={r.projectId}
                  onClick={() => onPick(r.projectId)}
                >
                  <TableCell className="font-medium">{r.name}</TableCell>
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
