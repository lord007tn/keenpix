# @keenpix/remix

Responsive image props for Remix 2 and React Router Framework Mode. These
frameworks use standard React image elements, so this adapter stays isomorphic
and works in server-rendered routes without client-only code.

```tsx
import { createRemixImage } from '@keenpix/remix'

const image = createRemixImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export default function Hero() {
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

Support status: stable. No route loader or browser-only module is required.
