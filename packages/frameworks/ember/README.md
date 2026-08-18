# @keenpix/ember

Importable Keenpix helpers for modern Ember templates.

## Install

```sh
pnpm add @keenpix/ember
```

Ember's current template-tag format treats imported plain functions as local
helpers. Configure the helper once in a `.gjs` or `.gts` module:

```gjs
import { createKeenpixUrlHelper } from '@keenpix/ember';

const keenpixUrl = createKeenpixUrlHelper({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
});

<template>
  <img
    src={{keenpixUrl @src width=1200 format="webp"}}
    alt={{@alt}}
    width="1200"
    height="675"
  />
</template>
```

`createKeenpixImageAttributesHelper()` is also available for JavaScript-side
attribute composition.

Support status: **stable** for Ember 5 and newer using imported local helpers.
The adapter deliberately has no Ember runtime dependency because modern Ember
helpers are plain functions. Classic globally registered helpers are not
installed automatically.
