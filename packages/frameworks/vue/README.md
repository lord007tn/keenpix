# `@keenpix/vue`

Stable Vue 3 component and responsive image attributes. URL generation is isomorphic and works during SSR and hydration.

```bash
pnpm add @keenpix/vue
```

```vue
<script setup lang="ts">
import { createVueKeenpix } from '@keenpix/vue'

const { Image: KeenpixImage } = createVueKeenpix({
  baseUrl: 'https://images.example.com',
  projectId: 'website',
})
</script>

<template>
  <KeenpixImage
    alt="Mountain at sunrise"
    src="photos/mountain.jpg"
    sizes="(max-width: 768px) 100vw, 768px"
    :widths="[480, 768, 1280]"
    decoding="async"
    loading="lazy"
  />
</template>
```

For a native `<img>`, use `imageProps()` with `v-bind`. The adapter deliberately returns lowercase `srcset`, matching Vue DOM bindings. All transform and URL behavior comes from `@keenpix/core`.
