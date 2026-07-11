# Keenpix blog editorial image manifest

Keenpix uses the repository's Takumi renderer for the release pipeline. Every published post declares one versioned `/og/blog/<slug>.png?v=<content-date>` path and descriptive alt text in frontmatter. The same 1200×630 PNG is rendered visibly beside the article title, on listing cards, in Open Graph/Twitter metadata, and in BlogPosting schema.

The renderer varies the central editorial metaphor by article type—comparison, pricing, deployment, responsive images, or request pipeline—while keeping the optical-lab brand system. This is deterministic, reviewable, and cache-safe; no external image model or untracked raster source is required for v0.2.0.

## Shared specification

- Hero/social source: dynamic 1200×630 PNG from `src/routes/og/blog/$.tsx`.
- Display ratio: 40:21 with explicit 1200×630 dimensions on article and listing images.
- Palette: pipeline navy `#07111F`, transform cyan `#21C8F6`, delivery green `#34E58D`, cloud white `#F8FAFC`.
- Visual language: technical geometry, modular pipelines, restrained glow, no stock photography, no fake customer UI, no competitor logos.

## Approved first cluster

| Slug | Editorial visual | Alt text |
| --- | --- | --- |
| `what-is-an-image-cdn` | A source tile moving through validation, transformation, variant cache, and edge delivery, with each stage represented by the Keenpix modular-tile system. | `Image CDN request moving through origin validation, transformation, caching, and edge delivery` |
| `image-cdn-vs-traditional-cdn` | Split diagram: unchanged source cached on the traditional-CDN side; multiple sized and formatted variants created before caching on the image-CDN side. Equal visual weight and no winner badge. | `Traditional CDN caching an existing file compared with an image CDN creating optimized variants` |
| `responsive-image-cdn-guide` | A responsive layout grid selecting 400, 800, and 1200-pixel candidates across phone, tablet, and desktop frames, with AVIF/WebP format branches. | `Responsive image layout selecting width and format variants for phone, tablet, and desktop` |

## Existing six posts

The existing six posts use the same required frontmatter contract. Comparison cards render neutral paired panels without competitor marks; pricing uses a meter composition and deployment uses a forked pipeline. The article title, description, alt text, and versioned path make every rendered response article-specific. The earlier raster briefs remain optional future art direction, not v0.2.0 file promises.

## Integration gate

- `image` and `imageAlt` are required by the blog content schema; incomplete posts fail MDX/type generation.
- `src/shared/blog-metadata.test.ts` enforces slug-matching PNG paths, version dates, alt presence, and metadata lengths.
- A substantive edit must update frontmatter `updated` and the image query version together before publication.
- Validate the rendered 1200×630 response, article crop, listing crop, text fit, MIME type, and cache header in release browser tests.
