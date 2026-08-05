# @keenpix/core

Framework-agnostic URL and responsive-image primitives for Keenpix.

```ts
import { createKeenpix } from '@keenpix/core'

const images = createKeenpix({
  baseUrl: 'https://keenpix.example.com',
  projectId: 'project-id',
})

images.url('https://cdn.example.com/hero.jpg', { width: 1200 })
```
