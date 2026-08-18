# `@keenpix/svelte`

Stable, SSR-safe responsive image attributes for Svelte 4 and 5. The helper has no browser runtime and works with normal Svelte attribute spreading.

```bash
pnpm add @keenpix/svelte
```

```svelte
<script lang="ts">
  import { createSvelteKeenpix } from '@keenpix/svelte'

  const { imageProps } = createSvelteKeenpix({
    baseUrl: 'https://images.example.com',
    projectId: 'website',
  })
</script>

<img
  {...imageProps({
    alt: 'Mountain at sunrise',
    src: 'photos/mountain.jpg',
    widths: [480, 768, 1280],
    sizes: '(max-width: 768px) 100vw, 768px',
  })}
  decoding="async"
  loading="lazy"
/>
```

The returned object uses lowercase `srcset`, matching Svelte's DOM attribute convention.
