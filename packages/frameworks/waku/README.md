# @keenpix/waku

RSC-safe image attributes for Waku. The adapter is pure and uses no hooks or
browser APIs, so it can be called from Waku server or client components.

```tsx
import { createWakuImage } from '@keenpix/waku'

const image = createWakuImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export default function Hero() {
  return <img {...image({ alt: 'Hero', src: '/hero.jpg', widths: [480, 960] })} />
}
```

Support status: preview while Waku 1.0 remains in beta.
