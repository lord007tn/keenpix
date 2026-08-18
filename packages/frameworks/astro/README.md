# `@keenpix/astro`

Stable Astro external image service and a lightweight attribute helper. The service integrates Keenpix with Astro's built-in `<Image />`, `<Picture />`, and `getImage()` APIs.

```bash
pnpm add @keenpix/astro
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config'

export default defineConfig({
  image: {
    service: {
      entrypoint: '@keenpix/astro/service',
      config: {
        baseUrl: 'https://images.example.com',
        projectId: 'website',
      },
    },
  },
})
```

```astro
---
import { Image } from 'astro:assets'
---

<Image src="photos/hero.jpg" alt="Hero" width={1200} height={675} quality={80} />
```

Keenpix is an external service, so source dimensions must be supplied unless your application resolves them separately. Numeric quality is forwarded; Astro's named quality presets remain Astro-specific.
