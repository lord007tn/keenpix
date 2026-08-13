# `@keenpix/sdk`

Server-side TypeScript client for the authenticated Keenpix management API. Use it to automate projects, delivery configuration, allowed domains, and cache prewarming.

```bash
pnpm add @keenpix/sdk
# or npm install @keenpix/sdk
```

```ts
import { createKeenpixClient } from '@keenpix/sdk'

const keenpix = createKeenpixClient({
  apiKey: process.env.KEENPIX_API_KEY!,
  baseUrl: 'https://keenpix.example.com',
})

const projects = await keenpix.listProjects()
const configuration = await keenpix.getConfiguration(projects[0].id)

await keenpix.prewarm(projects[0].id, {
  sources: ['/hero.jpg'],
  widths: [640, 1280, 1920],
  formats: ['avif', 'webp'],
})
```

The client exposes:

- `listProjects()`
- `createProject(input)`
- `getProject(projectId)`
- `getConfiguration(projectId)`
- `updateProject(projectId, input)`
- `addDomain(projectId, host)`
- `removeDomain(projectId, host)`
- `prewarm(projectId, input)`

Non-2xx responses throw `KeenpixApiError` with the HTTP `status` and parsed response `body`.

Server-side transform signing is available from `@keenpix/sdk/signing`:

```ts
import { signTransformRequest } from '@keenpix/sdk/signing'

const params = new URLSearchParams({ project: 'website', w: '1280' })
const signature = signTransformRequest(secret, '/hero.jpg', params)
```

Never expose the management API key or signing secret to browser or mobile code. Public framework packages only need a delivery base URL and project ID.

Full documentation: [keenpix.com/docs/reference/sdk-package](https://keenpix.com/docs/reference/sdk-package)

MIT licensed.
