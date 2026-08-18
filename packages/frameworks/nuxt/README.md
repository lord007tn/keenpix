# `@keenpix/nuxt`

Stable custom provider for Nuxt Image. It follows Nuxt Image's isomorphic `getImage(src, context)` provider contract.

```bash
pnpm add @keenpix/nuxt @nuxt/image
```

Create `providers/keenpix.ts`:

```ts
import { defineProvider } from '@nuxt/image/runtime'
import { createManagedKeenpixConfig, createNuxtImageProvider } from '@keenpix/nuxt'

const managed = createManagedKeenpixConfig('website')

export default defineProvider(
  createNuxtImageProvider({
    baseURL: managed.baseUrl,
    projectId: managed.projectId,
    projectInPath: managed.projectInPath,
  }),
)
```

Register it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxt/image'],
  image: {
    provider: 'keenpix',
    providers: {
      keenpix: { provider: '~/providers/keenpix' },
    },
  },
})
```

Then use `<NuxtImg src="photos/hero.jpg" width="1200" quality="80" />`. `baseURL` may instead be supplied by Nuxt Image as a provider option.
