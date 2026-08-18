# @keenpix/lit

Native Lit template helpers for responsive Keenpix images.

## Install

```sh
pnpm add @keenpix/lit lit
```

Use `keenpixImage()` inside any Lit template:

```ts
import { html } from 'lit'
import { keenpixImage } from '@keenpix/lit'

const config = {
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
}

export const hero = html`
  ${keenpixImage(config, {
    alt: 'Product hero',
    src: 'https://origin.example.com/hero.jpg',
    widths: [640, 960, 1200],
    sizes: '100vw',
    loading: 'lazy',
  })}
`
```

Optional attributes are omitted with Lit's `ifDefined` directive rather than
serialized as empty or `undefined` values.

Support status: **stable** for Lit 3 and newer. The helper returns a standard
Lit `TemplateResult` and works in Lit elements and Lit SSR render trees.
