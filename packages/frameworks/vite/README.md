# `@keenpix/vite`

Stable Vite plugin exposing one public Keenpix configuration through the conventional `virtual:keenpix` module. It works in client and SSR environments.

```bash
pnpm add @keenpix/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { keenpix } from '@keenpix/vite'

export default defineConfig({
  plugins: [keenpix({ baseUrl: 'https://images.example.com', projectId: 'website' })],
})
```

```ts
import keenpix from 'virtual:keenpix'

const url = keenpix.url('hero.jpg', { width: 1200, format: 'webp' })
```

Add the package's virtual-module types to `src/vite-env.d.ts`:

```ts
/// <reference types="@keenpix/vite/client" />
```

Only public delivery configuration is serialized. Never place secrets in the plugin options or any `VITE_*` variable.
