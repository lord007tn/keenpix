# `@keenpix/vitepress`

Stable VitePress theme adapter extending `@keenpix/vue`. It preserves the base theme hook, provides Keenpix configuration to Vue, and can register a global image component.

```bash
pnpm add @keenpix/vitepress
```

```ts
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import { createVueKeenpix, withKeenpixTheme } from '@keenpix/vitepress'

const config = { baseUrl: 'https://images.example.com', projectId: 'docs' }
const { Image: KeenpixImage } = createVueKeenpix(config)

export default withKeenpixTheme(
  DefaultTheme,
  config,
  KeenpixImage,
)
```

The component is registered globally as `<KeenpixImage />`. Inside it, use `createVitePressImageProps()` or inject the `keenpix` configuration and call `createVueImageProps()`.

The package does not rewrite Markdown image syntax automatically because that would silently alter author content and bypass VitePress' Markdown pipeline.
