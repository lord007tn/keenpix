# @keenpix/fresh

Server-renderable Preact image component for Fresh 2.

## Install

```sh
deno add npm:@keenpix/fresh npm:preact
```

Bind the Keenpix configuration once and use the returned component from Fresh
routes or shared components:

```tsx
import { createKeenpixImage } from '@keenpix/fresh'

const Image = createKeenpixImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

export default function Hero() {
  return (
    <Image
      alt="Product hero"
      src="https://origin.example.com/hero.jpg"
      width={1200}
      widths={[640, 960, 1200]}
      sizes="100vw"
      loading="lazy"
    />
  )
}
```

`KeenpixImage` is also exported when passing `config` per render is preferable.
The component is a plain Preact component, so Fresh renders it on the server by
default and sends no client JavaScript unless it is used inside an island.

Support status: **stable** for Fresh 2 with Preact 10.19 or newer. Fresh is
distributed through JSR rather than npm, so the package declares only its real
runtime peer: `preact`.
