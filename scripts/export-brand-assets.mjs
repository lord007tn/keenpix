import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const brandDir = path.join(publicDir, 'brand')
const rasterDir = path.join(brandDir, 'raster')

const colors = {
  cloud: '#F8FAFC',
  cyan: '#21C8F6',
  cyanDeep: '#079ED4',
  green: '#34E58D',
  greenDeep: '#12B96C',
  navy: '#07111F',
  navyLift: '#0D2034',
}

function markArt(prefix = 'mark', monochrome = false) {
  const cyan = monochrome ? colors.cloud : `url(#${prefix}-cyan)`
  const green = monochrome ? colors.cloud : `url(#${prefix}-green)`
  const white = monochrome ? colors.cloud : `url(#${prefix}-white)`

  return `
    <defs>
      <linearGradient id="${prefix}-tile" x1="70" y1="60" x2="452" y2="472" gradientUnits="userSpaceOnUse">
        <stop stop-color="${colors.navyLift}" />
        <stop offset="1" stop-color="${colors.navy}" />
      </linearGradient>
      <linearGradient id="${prefix}-cyan" x1="95" y1="125" x2="190" y2="230" gradientUnits="userSpaceOnUse">
        <stop stop-color="#64E6FF" />
        <stop offset="1" stop-color="${colors.cyanDeep}" />
      </linearGradient>
      <linearGradient id="${prefix}-green" x1="320" y1="125" x2="410" y2="230" gradientUnits="userSpaceOnUse">
        <stop stop-color="#69F2B8" />
        <stop offset="1" stop-color="${colors.greenDeep}" />
      </linearGradient>
      <linearGradient id="${prefix}-white" x1="210" y1="75" x2="330" y2="245" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#D8E0EB" />
      </linearGradient>
    </defs>
    <rect x="32" y="32" width="448" height="448" rx="104" fill="url(#${prefix}-tile)" />
    <g stroke="#FFFFFF" stroke-opacity=".16" stroke-width="3">
      <rect x="92" y="132" width="92" height="92" rx="24" fill="${cyan}" />
      <path d="M225 73h73c20 0 36 16 36 36v62c0 11-5 21-14 27l-80 58c-19 14-46 0-46-23V104c0-17 14-31 31-31Z" fill="${white}" />
      <rect x="328" y="132" width="92" height="92" rx="24" fill="${green}" />
      <path d="M81 242h68c11 0 21 6 27 15l45 72c10 16-2 37-21 37H82c-19 0-34-15-34-34v-56c0-19 15-34 33-34Z" fill="${green}" />
      <path d="M363 240h68c19 0 34 15 34 34v57c0 19-15 34-34 34h-74c-10 0-19-5-24-13l-42-69c-11-18 2-43 23-43h49Z" fill="${white}" />
      <rect x="92" y="340" width="92" height="92" rx="24" fill="${cyan}" />
      <rect x="210" y="388" width="92" height="92" rx="24" fill="${green}" />
      <rect x="328" y="340" width="92" height="92" rx="24" fill="${cyan}" />
    </g>`
}

function iconSvg({ title, description, monochrome = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">${description}</desc>
  ${markArt('icon', monochrome).trim()}
</svg>
`
}

function horizontalLogo(reverse = false) {
  const ink = reverse ? colors.cloud : colors.navy
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 256" role="img" aria-labelledby="title desc">
  <title id="title">Keenpix horizontal logo${reverse ? ' for dark backgrounds' : ''}</title>
  <desc id="desc">The Keenpix modular image mark beside the Keenpix wordmark.</desc>
  <g transform="translate(18 18) scale(.4296875)">${markArt(`horizontal-${reverse ? 'reverse' : 'default'}`).trim()}</g>
  <text x="264" y="171" fill="${ink}" font-family="Inter, Segoe UI, sans-serif" font-size="128" font-weight="760" letter-spacing="-5">Keenpix</text>
</svg>
`
}

function ogCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">Keenpix — optimized images, minus the surprise bill</title>
  <desc id="desc">Keenpix social card with the modular image mark and product promise.</desc>
  <defs>
    <linearGradient id="og-bg" x1="80" y1="30" x2="1100" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#102A43" />
      <stop offset=".58" stop-color="${colors.navy}" />
      <stop offset="1" stop-color="#040A12" />
    </linearGradient>
    <radialGradient id="og-glow-cyan" cx="0" cy="0" r="1" gradientTransform="translate(880 190) rotate(130) scale(380)" gradientUnits="userSpaceOnUse">
      <stop stop-color="${colors.cyan}" stop-opacity=".22" />
      <stop offset="1" stop-color="${colors.cyan}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="og-glow-green" cx="0" cy="0" r="1" gradientTransform="translate(1030 500) rotate(-140) scale(330)" gradientUnits="userSpaceOnUse">
      <stop stop-color="${colors.green}" stop-opacity=".18" />
      <stop offset="1" stop-color="${colors.green}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#og-bg)" />
  <rect width="1200" height="630" fill="url(#og-glow-cyan)" />
  <rect width="1200" height="630" fill="url(#og-glow-green)" />
  <g opacity=".08" stroke="#B8D4EA">
    <path d="M0 126h1200M0 252h1200M0 378h1200M0 504h1200" />
    <path d="M120 0v630M240 0v630M360 0v630M480 0v630M600 0v630M720 0v630M840 0v630M960 0v630M1080 0v630" />
  </g>
  <g transform="translate(742 66) scale(.91)">${markArt('og-mark').trim()}</g>
  <text x="86" y="133" fill="${colors.cloud}" font-family="Inter, Segoe UI, sans-serif" font-size="54" font-weight="760" letter-spacing="-2">Keenpix</text>
  <rect x="86" y="166" width="92" height="6" rx="3" fill="${colors.cyan}" />
  <rect x="184" y="166" width="52" height="6" rx="3" fill="${colors.green}" />
  <text x="86" y="292" fill="#FFFFFF" font-family="Inter, Segoe UI, sans-serif" font-size="67" font-weight="720" letter-spacing="-3">Optimized images.</text>
  <text x="86" y="370" fill="#FFFFFF" font-family="Inter, Segoe UI, sans-serif" font-size="67" font-weight="720" letter-spacing="-3">Minus the surprise bill.</text>
  <text x="88" y="443" fill="#B8CADB" font-family="Inter, Segoe UI, sans-serif" font-size="29" font-weight="500">AVIF/WebP · one URL · unlimited transforms</text>
  <text x="88" y="492" fill="#B8CADB" font-family="Inter, Segoe UI, sans-serif" font-size="29" font-weight="500">Honest bandwidth pricing, or self-host free.</text>
  <text x="88" y="563" fill="${colors.cyan}" font-family="Inter, Segoe UI, sans-serif" font-size="25" font-weight="700" letter-spacing="1.5">KEENPIX.COM</text>
</svg>
`
}

const svgAssets = {
  'keenpix-icon.svg': iconSvg({
    title: 'Keenpix icon',
    description:
      'Eight modular image tiles forming a circular optimization pipeline.',
  }),
  'keenpix-favicon.svg': iconSvg({
    title: 'Keenpix favicon',
    description: 'Compact Keenpix modular image pipeline mark.',
  }),
  'keenpix-app-icon.svg': iconSvg({
    title: 'Keenpix app icon',
    description: 'Keenpix modular image pipeline mark on a deep navy tile.',
  }),
  'keenpix-icon-monochrome.svg': iconSvg({
    title: 'Keenpix monochrome icon',
    description: 'One-color Keenpix modular image pipeline mark.',
    monochrome: true,
  }),
  'keenpix-social-avatar.svg': iconSvg({
    title: 'Keenpix social avatar',
    description:
      'Keenpix modular image pipeline mark sized for social profiles.',
  }),
  'keenpix-logo-horizontal.svg': horizontalLogo(),
  'keenpix-logo-horizontal-reverse.svg': horizontalLogo(true),
  'keenpix-og-card.svg': ogCardSvg(),
}

await mkdir(brandDir, { recursive: true })
await rm(rasterDir, { recursive: true, force: true })

for (const [name, contents] of Object.entries(svgAssets)) {
  await writeFile(path.join(brandDir, name), contents)
}

const jobs = [
  ['keenpix-favicon.svg', 'favicon/favicon-16.png', 16, 16],
  ['keenpix-favicon.svg', 'favicon/favicon-32.png', 32, 32],
  ['keenpix-favicon.svg', 'favicon/favicon-48.png', 48, 48],
  ['keenpix-favicon.svg', 'favicon/favicon-64.png', 64, 64],
  ['keenpix-app-icon.svg', 'app-icon/apple-touch-icon-180.png', 180, 180],
  ['keenpix-app-icon.svg', 'app-icon/mstile-150.png', 150, 150],
  ['keenpix-app-icon.svg', 'app-icon/android-chrome-192.png', 192, 192],
  ['keenpix-app-icon.svg', 'app-icon/android-chrome-512.png', 512, 512],
  ['keenpix-app-icon.svg', 'app-icon/app-icon-1024.png', 1024, 1024],
  ['keenpix-icon.svg', 'icon/keenpix-icon-64.png', 64, 64],
  ['keenpix-icon.svg', 'icon/keenpix-icon-128.png', 128, 128],
  ['keenpix-icon.svg', 'icon/keenpix-icon-256.png', 256, 256],
  ['keenpix-icon.svg', 'icon/keenpix-icon-512.png', 512, 512],
  ['keenpix-icon.svg', 'icon/keenpix-icon-1024.png', 1024, 1024],
  [
    'keenpix-social-avatar.svg',
    'social/keenpix-social-avatar-512.png',
    512,
    512,
  ],
  [
    'keenpix-social-avatar.svg',
    'social/keenpix-social-avatar-1024.png',
    1024,
    1024,
  ],
  [
    'keenpix-logo-horizontal.svg',
    'logo/keenpix-logo-horizontal.png',
    1024,
    256,
  ],
  [
    'keenpix-logo-horizontal-reverse.svg',
    'logo/keenpix-logo-horizontal-reverse.png',
    1024,
    256,
  ],
  ['keenpix-og-card.svg', 'social/keenpix-og-card.png', 1200, 630],
]

const manifest = []
for (const [source, relativeOutput, width, height] of jobs) {
  const output = path.join(rasterDir, relativeOutput)
  await mkdir(path.dirname(output), { recursive: true })
  await sharp(path.join(brandDir, source))
    .resize(width, height, { fit: 'contain' })
    .png({ compressionLevel: 9, palette: width <= 64 })
    .toFile(output)
  manifest.push({
    source,
    file: `public/brand/raster/${relativeOutput}`,
    width,
    height,
  })
}

const ogJpg = path.join(rasterDir, 'social/keenpix-og-card.jpg')
await sharp(path.join(brandDir, 'keenpix-og-card.svg'))
  .resize(1200, 630)
  .flatten({ background: colors.navy })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(ogJpg)
manifest.push({
  source: 'keenpix-og-card.svg',
  file: 'public/brand/raster/social/keenpix-og-card.jpg',
  width: 1200,
  height: 630,
})

await writeFile(
  path.join(rasterDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
)

async function pngFilesToIco(files) {
  const images = await Promise.all(files.map(async (file) => readFile(file)))
  const headerSize = 6
  const directorySize = images.length * 16
  let offset = headerSize + directorySize
  const header = Buffer.alloc(headerSize + directorySize)

  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  images.forEach((image, index) => {
    const entry = headerSize + index * 16
    const width = image.readUInt32BE(16)
    const height = image.readUInt32BE(20)
    header.writeUInt8(width >= 256 ? 0 : width, entry)
    header.writeUInt8(height >= 256 ? 0 : height, entry + 1)
    header.writeUInt8(0, entry + 2)
    header.writeUInt8(0, entry + 3)
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(image.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += image.length
  })

  return Buffer.concat([header, ...images])
}

await copyFile(
  path.join(brandDir, 'keenpix-favicon.svg'),
  path.join(publicDir, 'favicon.svg'),
)
await copyFile(
  path.join(rasterDir, 'favicon/favicon-16.png'),
  path.join(publicDir, 'favicon-16x16.png'),
)
await copyFile(
  path.join(rasterDir, 'favicon/favicon-32.png'),
  path.join(publicDir, 'favicon-32x32.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/apple-touch-icon-180.png'),
  path.join(publicDir, 'apple-touch-icon.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/mstile-150.png'),
  path.join(publicDir, 'mstile-150x150.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/android-chrome-192.png'),
  path.join(publicDir, 'android-chrome-192x192.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/android-chrome-512.png'),
  path.join(publicDir, 'android-chrome-512x512.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/android-chrome-192.png'),
  path.join(publicDir, 'logo192.png'),
)
await copyFile(
  path.join(rasterDir, 'app-icon/android-chrome-512.png'),
  path.join(publicDir, 'logo512.png'),
)
await copyFile(
  path.join(rasterDir, 'social/keenpix-og-card.png'),
  path.join(brandDir, 'keenpix-og-card.png'),
)
await copyFile(ogJpg, path.join(brandDir, 'keenpix-og-card.jpg'))

const ico = await pngFilesToIco([
  path.join(rasterDir, 'favicon/favicon-16.png'),
  path.join(rasterDir, 'favicon/favicon-32.png'),
  path.join(rasterDir, 'favicon/favicon-48.png'),
])
await writeFile(path.join(publicDir, 'favicon.ico'), ico)

const webManifest = {
  id: '/',
  name: 'Keenpix — image optimization CDN',
  short_name: 'Keenpix',
  description:
    'Optimize and deliver AVIF/WebP images from one URL with honest bandwidth pricing, unlimited transforms, and a free self-hosted option.',
  lang: 'en',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: colors.navy,
  background_color: colors.navy,
  icons: [
    {
      src: '/favicon.svg',
      type: 'image/svg+xml',
      sizes: 'any',
      purpose: 'any',
    },
    {
      src: '/apple-touch-icon.png',
      type: 'image/png',
      sizes: '180x180',
      purpose: 'any',
    },
    {
      src: '/android-chrome-192x192.png',
      type: 'image/png',
      sizes: '192x192',
      purpose: 'any maskable',
    },
    {
      src: '/android-chrome-512x512.png',
      type: 'image/png',
      sizes: '512x512',
      purpose: 'any maskable',
    },
  ],
}
const manifestContents = `${JSON.stringify(webManifest, null, 2)}\n`
await writeFile(path.join(publicDir, 'site.webmanifest'), manifestContents)
await writeFile(path.join(publicDir, 'manifest.json'), manifestContents)
