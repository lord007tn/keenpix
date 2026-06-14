import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
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
import type { LogRow } from '@/shared/types'

// A compact glance at the newest requests for the dashboard bird's-eye. The full
// streaming, filterable view lives on the Live logs page.
export function RecentActivity({ logs }: { logs: LogRow[] }) {
  return (
    <Card className="p-0">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Newest image requests</CardDescription>
        </div>
        <Link
          className="text-muted-foreground text-xs hover:text-foreground"
          to="/app/logs"
        >
          View all logs →
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted-foreground text-sm">
            No requests yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead className="w-full">Path</TableHead>
                <TableHead>Format</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead>Cache</TableHead>
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {dayjs(l.ts).format('MMM D, HH:mm:ss')}
                  </TableCell>
                  <TableCell className="max-w-0 truncate">{l.path}</TableCell>
                  <TableCell className="text-foreground">{l.format}</TableCell>
                  <TableCell
                    className={`text-right ${l.status === 200 ? 'text-success-text' : 'text-destructive-text'}`}
                  >
                    {l.status}
                  </TableCell>
                  <TableCell
                    className={l.cached ? 'text-success-text' : 'text-primary'}
                  >
                    {l.cached ? 'HIT' : 'MISS'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {l.latency}ms
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
