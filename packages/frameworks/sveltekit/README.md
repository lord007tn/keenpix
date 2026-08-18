# `@keenpix/sveltekit`

Stable SvelteKit adapter built on `@keenpix/svelte`. It provides SSR-safe image props and a URL loader from one configuration object.

```bash
pnpm add @keenpix/sveltekit
```

```ts
// src/lib/keenpix.ts
import { createSvelteKitKeenpix } from '@keenpix/sveltekit'

export const keenpix = createSvelteKitKeenpix({
  baseUrl: 'https://images.example.com',
  projectId: 'website',
})
```

```svelte
<script lang="ts">
  import { keenpix } from '$lib/keenpix'
</script>

<img {...keenpix.imageProps({ alt: 'Hero', src: 'hero.jpg', widths: [640, 1280] })} />
```

The package does not install a SvelteKit hook because image URL generation is pure and isomorphic; this keeps it safe for SSR, prerendering, and client navigation.
