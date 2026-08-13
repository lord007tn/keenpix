# @keenpix/eleventy

Eleventy plugin with a universal image shortcode and URL filter.

## Install

```sh
pnpm add @keenpix/eleventy
```

Register it in `eleventy.config.js`:

```js
import keenpix from '@keenpix/eleventy'

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(keenpix, {
    config: {
      baseUrl: 'https://images.example.com',
      projectId: 'project-id',
    },
  })
}
```

Use the universal shortcode from Liquid, Nunjucks, Markdown, or JavaScript
templates:

```njk
{% keenpixImage image.url, image.alt, {
  widths: [640, 960, 1200],
  sizes: "100vw",
  loading: "lazy"
} %}
```

The `keenpixUrl` filter returns a single transformed URL. Both registration
names can be changed with `imageShortcodeName` and `urlFilterName`.

Support status: **stable** for Eleventy 2 and newer. The shortcode escapes all
HTML attribute values and uses Eleventy's universal shortcode API.
