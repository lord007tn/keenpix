# @keenpix/docusaurus

Keenpix image props for Docusaurus 3 MDX pages and React components.

```mdx
import { createDocusaurusImage } from '@keenpix/docusaurus'

export const image = createDocusaurusImage({
  baseUrl: 'https://images.example.com',
  projectId: 'project-id',
})

<img
  {...image({
    alt: 'Architecture diagram',
    src: 'https://origin.example.com/architecture.png',
    width: 1200,
    widths: [480, 768, 1200],
  })}
  loading="lazy"
/>
```

Docusaurus' normal Markdown image syntax and imported local assets receive
build-time processing and should remain unchanged. Use this adapter explicitly
for remote images served by Keenpix. Support status: stable compatibility
adapter.
