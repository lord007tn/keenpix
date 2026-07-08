import sharp from 'sharp'

// One-off asset step: the marketing hero renders /brand/keenpix-og.png full-bleed
// as the LCP element, but that PNG is ~815 KB — a Core Web Vitals liability for an
// image-optimization product. This regenerates compression-optimized AVIF/WebP
// variants (the PNG stays as the static OG/social card). Run with:
//   pnpm exec tsx scripts/generate-brand-images.ts
const SOURCE = 'public/brand/keenpix-og.png'

const source = sharp(SOURCE)
const meta = await source.metadata()
console.log(`source ${meta.width}x${meta.height} ${meta.format}`)

await sharp(SOURCE)
  .avif({ quality: 46, effort: 6 })
  .toFile('public/brand/keenpix-hero.avif')
await sharp(SOURCE)
  .webp({ quality: 68, effort: 6 })
  .toFile('public/brand/keenpix-hero.webp')

for (const file of ['keenpix-hero.avif', 'keenpix-hero.webp']) {
  const { size } = await sharp(`public/brand/${file}`).metadata()
  console.log(`${file} ${size ? Math.round(size / 1024) : '?'} KB`)
}
