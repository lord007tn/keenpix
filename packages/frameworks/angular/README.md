# @keenpix/angular

Angular `NgOptimizedImage` loader for Keenpix.

## Install

```sh
pnpm add @keenpix/angular
```

Angular 16 or newer is supported. Register the provider where your application
providers are declared:

```ts
import { provideKeenpixImageLoader } from '@keenpix/angular'

export const appConfig = {
  providers: [
    provideKeenpixImageLoader({
      baseUrl: 'https://images.example.com',
      projectId: 'project-id',
    }),
  ],
}
```

Use Angular's `NgOptimizedImage` directive normally. Keenpix receives the
responsive widths Angular generates for `ngSrcset`:

```html
<img
  ngSrc="https://origin.example.com/hero.jpg"
  width="1200"
  height="675"
  ngSrcset="640w, 960w, 1200w"
  sizes="100vw"
  [loaderParams]="{ format: 'webp', quality: 82, fit: 'cover' }"
  alt="Product hero"
/>
```

Support status: **stable**. The loader follows Angular's public
`IMAGE_LOADER`/`ImageLoaderConfig` contract and supports all Keenpix transform
options through `loaderParams`.
