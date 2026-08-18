# @keenpix/html

Framework-free responsive image helpers for Keenpix.

## Install

```sh
pnpm add @keenpix/html
```

Create attributes for a DOM renderer or template system:

```ts
import { createHtmlImageAttributes } from '@keenpix/html'

const attributes = createHtmlImageAttributes(
  { baseUrl: 'https://images.example.com', projectId: 'project-id' },
  {
    alt: 'Product hero',
    src: 'https://origin.example.com/hero.jpg',
    width: 1200,
    widths: [640, 960, 1200],
    sizes: '100vw',
    loading: 'lazy',
  },
)
```

For static-site generators and server rendering, `renderKeenpixImage()` returns
an escaped `<img>` string. It never inserts unescaped attribute values.

Support status: **stable**. This package has no framework or browser runtime
dependency and re-exports the complete `@keenpix/core` API.
