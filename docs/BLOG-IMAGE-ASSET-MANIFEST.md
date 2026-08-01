# Keenpix blog editorial image manifest

Keenpix uses the repository's Takumi renderer as the required fallback for every post. Every published post declares one versioned `/og/blog/<slug>.png?v=<content-date>` path and descriptive alt text in frontmatter, so an article never depends on an external image-generation service at request time.

Posts that benefit from deeper editorial art can also declare an optional static pair: a text-free 1600×900 WebP `cover` for visible article/listing surfaces and a 1200×630 JPEG `ogImage` for social metadata and BlogPosting schema. The pair is generated before publication, optimized, committed, and visually reviewed. Posts without it continue to use the deterministic Takumi card everywhere.

## Shared specification

- Required fallback: dynamic 1200×630 PNG from `src/routes/og/blog/$.tsx`.
- Optional editorial hero: static 1600×900 WebP under `public/editorial`.
- Optional social crop: static 1200×630 progressive JPEG under `public/editorial`.
- Display ratio: 40:21 with explicit 1200×630 dimensions on article and listing images.
- Palette: pipeline navy `#07111F`, transform cyan `#21C8F6`, delivery green `#34E58D`, cloud white `#F8FAFC`.
- Visual language: technical geometry, modular pipelines, restrained glow, no stock photography, no fake customer metrics or quotes, no competitor logos.

## Generated editorial workflow

1. Write the article and identify one visual story that adds information beyond its title.
2. Generate a text-free landscape source with the Keenpix palette and modular-pipeline language from `brand.md`. Keep important subjects inside the central 80% for both crops.
3. Reject images with fake UI text, logos, metrics, certification marks, customer quotes, purple gradients, or visual claims the article cannot support.
4. Export `<slug>-cover.webp` at 1600×900 and `<slug>-og.jpg` at 1200×630. Target less than 180 KB each unless image quality visibly requires more.
5. Add `cover`, `coverAlt`, and `ogImage` together, with the content date as a `?v=YYYY-MM-DD` cache key. The metadata test rejects an incomplete, unversioned, or incorrectly named set.
6. Inspect both final crops at original resolution, then verify the listing card, article hero, social metadata, MIME type, dimensions, and cache behavior.

The JoodCMS case-study concept uses a CMS media library flowing through a central modular transform ring into phone, tablet, and desktop variants. The prompt forbids text, logos, people, fake metrics, quotes, benchmark numbers, and literal customer UI. It uses pipeline navy, transform cyan, delivery green, and cloud white on a dark optical-lab surface.

## Approved first cluster

| Slug | Editorial visual | Alt text |
| --- | --- | --- |
| `what-is-an-image-cdn` | A source tile moving through validation, transformation, variant cache, and edge delivery, with each stage represented by the Keenpix modular-tile system. | `Image CDN request moving through origin validation, transformation, caching, and edge delivery` |
| `image-cdn-vs-traditional-cdn` | Split diagram: unchanged source cached on the traditional-CDN side; multiple sized and formatted variants created before caching on the image-CDN side. Equal visual weight and no winner badge. | `Traditional CDN caching an existing file compared with an image CDN creating optimized variants` |
| `responsive-image-cdn-guide` | A responsive layout grid selecting 400, 800, and 1200-pixel candidates across phone, tablet, and desktop frames, with AVIF/WebP format branches. | `Responsive image layout selecting width and format variants for phone, tablet, and desktop` |

## Existing dynamic posts

The existing dynamic posts use the same required frontmatter contract. Comparison cards render neutral paired panels without competitor marks; pricing uses a meter composition and deployment uses a forked pipeline. The article title, description, alt text, and versioned path make every rendered response article-specific. The earlier raster briefs remain optional future art direction, not file promises.

## Authored case-study art

| Slug | Cover | Social card | Visual claim |
| --- | --- | --- | --- |
| `joodcms-keenpix-integration` | `/editorial/joodcms-keenpix-integration-cover.webp?v=2026-07-13` | `/editorial/joodcms-keenpix-integration-og.jpg?v=2026-07-13` | CMS media flows through a project-aware image pipeline into responsive storefront variants. No production metric is depicted. |

## Integration gate

- `image` and `imageAlt` remain required by the blog content schema; incomplete posts fail MDX/type generation.
- Authored raster art must provide `cover`, `coverAlt`, and `ogImage` as one complete set.
- `src/shared/blog-metadata.test.ts` enforces slug-matching PNG paths, version dates, alt presence, and metadata lengths.
- A substantive edit must update frontmatter `updated` and the image query version together before publication.
- Validate the rendered fallback, article cover, listing crop, social card, alt text, MIME types, dimensions, and cache headers in release browser tests.
