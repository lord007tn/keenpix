# Keenpix Brand Assets

Keenpix uses a modular image-pipeline mark: eight transformed tiles orbit an open center, moving from source-white through optimization-cyan and delivery-green. The system is deliberately technical and precise without looking like generic cloud infrastructure.

## Brand idea

- **Promise:** optimized images, minus the surprise bill.
- **Personality:** transparent, fast, exact, developer-friendly, and quietly confident.
- **Visual direction:** optical lab meets modular pipeline. Deep navy provides contrast; cyan represents transformation; green represents efficient delivery; cloud white represents the original source.
- **Avoid:** purple SaaS gradients, generic cloud glyphs, stock photography, heavy glassmorphism, and using the mark without its navy contrast tile.

## Core palette

| Token | Hex | Use |
| --- | --- | --- |
| Pipeline navy | `#07111F` | Primary brand tile, dark surfaces, favicon background |
| Lifted navy | `#0D2034` | Subtle depth and large dark compositions |
| Transform cyan | `#21C8F6` | Primary action and image-transformation signal |
| Cyan depth | `#079ED4` | Cyan gradient endpoint and data accents |
| Delivery green | `#34E58D` | Successful delivery, cache hits, efficiency |
| Green depth | `#12B96C` | Green gradient endpoint and success depth |
| Cloud white | `#F8FAFC` | Source tile, reverse wordmark, light foreground |

## Asset locations

Vector source assets live in `public/brand`:

| Asset | File | Use |
| --- | --- | --- |
| Core icon | `keenpix-icon.svg` | Product UI, docs, avatars, and compact brand use |
| Favicon source | `keenpix-favicon.svg` | Browser favicon and tiny icon exports |
| App icon source | `keenpix-app-icon.svg` | PWA, launcher, Apple, Android, and tile exports |
| Monochrome icon | `keenpix-icon-monochrome.svg` | One-color printing and fallback usage |
| Horizontal logo | `keenpix-logo-horizontal.svg` | Light headers, README, and partner pages |
| Reverse horizontal logo | `keenpix-logo-horizontal-reverse.svg` | Dark and navy surfaces |
| Social avatar | `keenpix-social-avatar.svg` | Social profile image source |
| Social card | `keenpix-og-card.svg` | Editable 1200×630 social-preview source |
| Social card PNG | `keenpix-og-card.png` | Open Graph and Twitter/X card |
| Social card JPEG | `keenpix-og-card.jpg` | Compatibility fallback |

Generated raster exports live in `public/brand/raster`. Browser and app icons are also copied to the `public` root:

- `favicon.svg`, `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png`, `mstile-150x150.png`
- `android-chrome-192x192.png`, `android-chrome-512x512.png`
- `site.webmanifest`

The legacy `logo192.png`, `logo512.png`, and `manifest.json` paths are regenerated from the same source for backwards compatibility.

## Usage rules

- Use the complete icon tile at small sizes. Do not extract or rearrange individual pipeline pieces.
- Keep at least one tile-width of clear space around the icon or wordmark.
- Use the default horizontal logo on light backgrounds and the reverse logo on dark backgrounds.
- Use the monochrome asset only where color reproduction is unavailable.
- Do not place the cyan and green pieces directly on a similarly bright background.
- Open Graph images must remain 1200×630 PNGs and should keep the product promise readable without page context.
- Organization and publisher schema should use the 512px launcher icon, not a wordmark or SVG-only asset.

## Regeneration and validation

Run:

```bash
pnpm brand:export
```

The exporter writes the vector sources, favicon set, launcher icons, social-card rasters, ICO bundle, web manifest, and raster manifest from one deterministic design definition. After editing the source, verify the 16px favicon, 180px Apple icon, 512px launcher icon, and 1200×630 social card visually before release.
