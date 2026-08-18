# @keenpix/redwood

Serializable responsive-image props for RedwoodSDK React Server Components and
RedwoodJS web applications.

```tsx
import { createRedwoodImage } from '@keenpix/redwood'

const image = createRedwoodImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export function Hero() {
  return <img {...image({ alt: 'Hero', src: '/hero.jpg', widths: [480, 960] })} />
}
```

The helper has no client directive, hooks, Node APIs, or framework runtime
imports. It is therefore valid in RedwoodSDK's server-first component model and
in RedwoodJS prerendered pages. Support status: stable compatibility adapter.
