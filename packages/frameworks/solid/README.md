# `@keenpix/solid`

Stable SolidJS adapter for responsive Keenpix image props. The helper is reactive-friendly when called from a memo or JSX expression and adds no client runtime.

```bash
pnpm add @keenpix/solid
```

```tsx
import { createMemo } from 'solid-js'
import { createSolidKeenpix } from '@keenpix/solid'

const keenpix = createSolidKeenpix({ baseUrl: 'https://images.example.com' })

export function Hero(props: { src: string }) {
  const imageProps = createMemo(() =>
    keenpix.imageProps({ alt: 'Hero', src: props.src, widths: [640, 1280] }),
  )

  return <img {...imageProps()} decoding="async" loading="lazy" />
}
```

Call `imageProps` inside a reactive expression when its inputs can change; Solid documentation advises against destructuring reactive props.
