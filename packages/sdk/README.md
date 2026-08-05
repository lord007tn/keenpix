# @keenpix/sdk

Server-side client for the authenticated Keenpix management API. Never expose its API key in browser code.

```ts
import { createKeenpixClient } from '@keenpix/sdk'

const keenpix = createKeenpixClient({
  apiKey: process.env.KEENPIX_API_KEY!,
  baseUrl: 'https://keenpix.com',
})

await keenpix.prewarm('project-id', {
  sources: ['https://cdn.example.com/hero.jpg'],
  widths: [640, 1280],
})
```
