# @keenpix/gatsby

Generate CDN-backed `gatsbyImageData` for Gatsby's dynamic `GatsbyImage`
component. Gatsby controls its layout, lazy loading, picture element, and source
selection while Keenpix supplies every transformed URL.

```tsx
import { GatsbyImage } from 'gatsby-plugin-image'
import { createGatsbyImageData } from '@keenpix/gatsby'

const image = createGatsbyImageData(
  { baseUrl: 'https://images.example.com', projectId: 'project-id' },
  {
    src: 'https://origin.example.com/hero.jpg',
    width: 1200,
    height: 800,
    formats: ['avif', 'webp'],
  },
)

export function Hero() {
  return <GatsbyImage image={image} alt="A mountain at sunrise" />
}
```

Source plugins should use Gatsby's official `getImageData` toolkit with
`createGatsbyUrlBuilder(config)` as its `urlBuilder`. This lets Gatsby calculate
breakpoints and layouts while Keenpix handles the generated CDN URLs.

This runtime helper is intended for remote, dimensioned images. Gatsby
`StaticImage` is statically analyzed and must continue to be imported directly
from `gatsby-plugin-image`. Support status: preview for Gatsby 5.
