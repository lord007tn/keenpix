# @keenpix/core

Framework-agnostic URL and responsive-image primitives for Keenpix.

```ts
import { createKeenpix, createManagedKeenpixConfig } from '@keenpix/core'

const images = createKeenpix(createManagedKeenpixConfig('project-id'))

images.url('https://cdn.example.com/hero.jpg', { width: 1200 })
```

Managed URLs use `https://cdn.keenpix.com/p/<project>/img/<encoded-source>`.
For self-hosting, pass your own `baseUrl` and `projectId` instead.

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
