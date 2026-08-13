# @keenpix/next

A native custom loader for the current Next.js `Image` component. Next remains
responsible for responsive widths, lazy loading, preload behavior, and layout;
Keenpix produces each transformed URL.

```tsx
import Image from 'next/image'
import { createNextImageProps } from '@keenpix/next'

const keenpix = { baseUrl: 'https://images.example.com', projectId: 'project-id' }

export default function Hero() {
  return (
    <Image
      {...createNextImageProps(keenpix, {
        src: 'https://origin.example.com/hero.jpg',
        alt: 'A mountain at sunrise',
        width: 1200,
        height: 800,
        fit: 'cover',
        quality: 80,
      })}
    />
  )
}
```

For a global `images.loaderFile`, export the result of `createNextLoader`. The
global loader supports Next's `src`, `width`, and `quality` contract; use
`createNextImageProps` when an image also needs Keenpix-specific transforms.

Support status: stable for Next.js 13 and newer App and Pages Routers.
