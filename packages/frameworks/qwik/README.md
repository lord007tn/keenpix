# `@keenpix/qwik`

Stable, serializable Keenpix props for Qwik and a transformer compatible with Qwik image-loader patterns. It creates no signals, tasks, or client listeners.

```bash
pnpm add @keenpix/qwik
```

```tsx
import { component$ } from '@builder.io/qwik'
import { createQwikKeenpix } from '@keenpix/qwik'

const keenpix = createQwikKeenpix({ baseUrl: 'https://images.example.com' })

export default component$(() => (
  <img {...keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', widths: [640, 1280] })} />
))
```

With `qwik-image`, wrap the framework-shaped transformer in Qwik's `$()` boundary and provide it globally:

```tsx
import { $, component$ } from '@builder.io/qwik'
import { Image, useImageProvider } from 'qwik-image'
import { createQwikImageTransformer } from '@keenpix/qwik'

const transform = createQwikImageTransformer({ baseUrl: 'https://images.example.com' })

export default component$(() => {
  useImageProvider({
    resolutions: [640, 960, 1280],
    imageTransformer$: $((input) => transform(input)),
  })

  return <Image alt="Hero" src="hero.jpg" width={1200} height={675} />
})
```

For local source imports, Qwik's built-in `?jsx` optimization remains the preferred zero-runtime path. Use Keenpix for remote or centrally managed assets.
