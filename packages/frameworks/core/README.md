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

All framework adapters inherit automatic responsive Client Hint modes:

```ts
images.url('https://cdn.example.com/hero.jpg', {
  width: 'auto',
  dpr: 'auto',
})
```

HMAC secrets stay out of frontend packages. Sign generated URLs in trusted
server or build code with `@keenpix/sdk/signing`. Project watermark overlays are
applied by the delivery service and require no framework-specific configuration.
