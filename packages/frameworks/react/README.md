# @keenpix/react

Responsive Keenpix images for React 18 and newer. The component renders a native
`img`, works during SSR, forwards ordinary image attributes, and keeps Keenpix
transform options out of the DOM.

```tsx
import { createKeenpixImage } from '@keenpix/react'

const Image = createKeenpixImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export function Hero() {
  return (
    <Image
      alt="A mountain at sunrise"
      src="https://origin.example.com/hero.jpg"
      width={1200}
      height={800}
      widths={[480, 768, 1200]}
      sizes="(max-width: 768px) 100vw, 1200px"
      quality={80}
      loading="lazy"
    />
  )
}
```

Use `KeenpixImage` directly when configuration differs per image. This package
is stable and is the shared React rendering layer used by Keenpix's React-based
framework adapters.
