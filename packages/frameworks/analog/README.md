# `@keenpix/analog`

Stable Analog/Angular `NgOptimizedImage` loader factory. Analog uses Angular's image directive, so this adapter returns the standard `IMAGE_LOADER` provider shape instead of introducing a second component.

```bash
pnpm add @keenpix/analog
```

```ts
import { IMAGE_LOADER } from '@angular/common'
import { createAnalogImageProvider } from '@keenpix/analog'

export const appConfig = {
  providers: [
    createAnalogImageProvider(IMAGE_LOADER, {
      baseUrl: 'https://images.example.com',
      projectId: 'website',
    }),
  ],
}
```

```html
<img ngSrc="hero.jpg" width="1200" height="675" alt="Hero" priority />
```

Pass `loaderParams: { quality, format }` through `NgOptimizedImage` when per-image overrides are needed.
