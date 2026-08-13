# `@keenpix/solid-start`

Stable isomorphic SolidStart adapter extending `@keenpix/solid`. It supports SSR, CSR, and prerendered routes without a server-only dependency.

```bash
pnpm add @keenpix/solid-start
```

```ts
// src/lib/keenpix.ts
import { createSolidStartKeenpix } from '@keenpix/solid-start'

export const keenpix = createSolidStartKeenpix({
  baseUrl: 'https://images.example.com',
  projectId: 'website',
})
```

```tsx
import { keenpix } from '~/lib/keenpix'

export default function Hero() {
  return <img {...keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', width: 1200 })} />
}
```

Use `keenpix.loader` when another SolidStart integration needs a width-based image URL.
