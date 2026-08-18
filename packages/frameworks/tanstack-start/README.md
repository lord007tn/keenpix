# @keenpix/tanstack-start

Isomorphic responsive-image props for TanStack Start's React adapter. TanStack
Start does not ship a framework image component; its official migration guide
recommends using a React image library. Keenpix therefore renders standards-
based image attributes that are stable across SSR and hydration.

```tsx
import { createTanStackImage } from '@keenpix/tanstack-start'

const image = createTanStackImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export function Hero() {
  return <img {...image({ alt: 'Hero', src: '/hero.jpg', widths: [480, 960] })} />
}
```

Keep `baseUrl` and `projectId` in public Vite configuration because image URLs
are rendered on both server and client. Support status: stable for TanStack
Start 1.x.
