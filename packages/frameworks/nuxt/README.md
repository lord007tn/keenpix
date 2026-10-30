# `@keenpix/nuxt`

Stable custom provider for Nuxt Image. It follows Nuxt Image's isomorphic `getImage(src, context)` provider contract.

```bash
pnpm add @keenpix/nuxt @nuxt/image
```

Create `app/providers/keenpix.ts` (Nuxt 4) or `providers/keenpix.ts` (Nuxt 3):

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

Then use `<NuxtImg src="https://assets.example.com/hero.jpg" width="1200" quality="75" alt="A mountain at sunrise" />`.

Add `assets.example.com` to the project's origin allowlist. Managed delivery requires
absolute source URLs; relative sources are rejected with HTTP 400. `baseURL` is the
**delivery base**, not a source origin, and can also be supplied as a provider option.

The default export above uses Nuxt Image v2. With v1, omit `defineProvider` and
export `const { getImage } = createNuxtImageProvider(...)` using the same options.
