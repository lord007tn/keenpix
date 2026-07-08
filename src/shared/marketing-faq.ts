// Single source of truth for the marketing-home FAQ: rendered as a visible
// section AND emitted as FAQPage structured data (Google requires the answers to
// be visible on the page). Written to target high-intent queries ("Cloudinary
// alternative", "image CDN pricing") and to be citable by AI search engines.
export const MARKETING_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'How does Keenpix pricing work?',
    answer:
      'Keenpix bills only on bandwidth delivered — never per transform. Cloud plans start at $9/mo for 100 GB delivered with unlimited transforms; overage is one published linear rate with a spending cap you set, so there are no surprise bills. Or self-host the open-source engine for free.',
  },
  {
    question: 'Is Keenpix a Cloudinary, imgix, or ImageKit alternative?',
    answer:
      'Yes. Keenpix is a lighter, cheaper image-CDN alternative to Cloudinary, imgix, and ImageKit: it optimizes and delivers images from your existing origin with transparent bandwidth-only pricing and no per-transform credits — and it is the only one you can also self-host as open source, so there is no vendor lock-in.',
  },
  {
    question: 'Do I have to migrate or re-upload my images?',
    answer:
      'No. Keenpix is a bring-your-own-origin proxy: point it at your existing S3, R2, or any origin and keep your URLs. There is no re-upload, no digital-asset-manager migration, and no lock-in.',
  },
  {
    question: 'Which image formats and transforms does Keenpix support?',
    answer:
      'AVIF, WebP, JPEG, PNG, GIF, HEIF, TIFF, and SVG, with sharp/IPX-style resize, crop, quality, and format controls. Transforms are unlimited on every plan and requested with a single URL — no SDK required.',
  },
  {
    question: 'Can I self-host Keenpix?',
    answer:
      'Yes. Keenpix is open-source (AGPL). Run the exact same transform and delivery engine on your own infrastructure with Docker, free and unlimited. The managed cloud is simply the hosted, supported version of the same engine.',
  },
  {
    question: 'How much smaller are images with Keenpix?',
    answer:
      'Modern formats like AVIF and WebP typically cut image weight 40–70% versus JPEG or PNG, and Keenpix reports the exact bytes saved per project in its built-in analytics.',
  },
]
