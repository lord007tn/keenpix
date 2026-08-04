import { CodeBlock } from '@/components/app/code-block'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Project } from '@/shared/types'

// Shown on the dashboard once a project exists but no traffic has arrived yet —
// the moment a new user most needs to know how to actually call keenpix. Uses
// their REAL project id + origin so the example is copy-paste runnable.
export function QuickStart({ project }: { project: Project }) {
  const base =
    typeof window === 'undefined'
      ? 'https://keenpix.com'
      : window.location.origin
  const cloudDelivery = new URL(base).hostname === 'keenpix.com'
  const deliveryBase = cloudDelivery
    ? `https://cdn.keenpix.com/p/${project.id}`
    : base
  const projectQuery = cloudDelivery ? '' : `project=${project.id}&`
  const url = `${deliveryBase}/img/${project.origin}/your-image.jpg?${projectQuery}w=800&fmt=webp`
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick start — your transform URL</CardTitle>
        <CardDescription>
          No requests yet. Point an <code>&lt;img&gt;</code> at your keenpix URL
          — swap <code>your-image.jpg</code> for a real path on{' '}
          <span className="font-mono">{project.origin}</span>. No API key
          needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CodeBlock>{`<img
  src="${url}"
  width="800" alt="" />`}</CodeBlock>
      </CardContent>
    </Card>
  )
}
