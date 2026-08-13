# @keenpix/preact

Small, dependency-free image prop helpers for Preact 10 and newer.

```tsx
import { createPreactImage } from '@keenpix/preact'

const image = createPreactImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export function Hero() {
  return (
    <img
      {...image({
        alt: 'A mountain at sunrise',
        src: 'https://origin.example.com/hero.jpg',
        width: 1200,
        height: 800,
        widths: [480, 768, 1200],
      })}
      loading="lazy"
    />
  )
}
```

The result uses standard DOM `img` props, so it works with Preact SSR and does
not require a client context. Support status: stable.
