// Single source of truth for the marketing-home FAQ: rendered as a visible
// section AND emitted as FAQPage structured data (Google requires the answers to
// be visible on the page). Written to target high-intent queries ("Cloudinary
// alternative", "image CDN pricing") and to be citable by AI search engines.
export const MARKETING_FAQ: Array<{ answer: string; question: string }> = [
  {
    question: 'How does Keenpix pricing work?',
    answer:
      'Keenpix bills on one thing — bandwidth delivered at the edge — and never per transform. Managed cloud starts at $9/mo for 100 GB delivered with unlimited transforms, and scales to Pro ($19/mo, 400 GB) and Business ($29/mo, 1 TB). Overage is a single published linear rate between $0.05 and $0.08 per GB depending on tier — typically 3–6× cheaper than credit-based rivals — and you set a hard spending cap so the bill can never surprise you. Transforms, responsive srcset variants, and modern formats are always free and unlimited, so optimizing aggressively lowers your bill instead of raising it. Prefer to pay nothing? Self-host the same open-source engine for free.',
  },
  {
    question: 'Is Keenpix a Cloudinary, imgix, or ImageKit alternative?',
    answer:
      'Yes. Keenpix is a lighter, cheaper image-CDN alternative to Cloudinary, imgix, and ImageKit. It optimizes and delivers images from your existing S3, R2, or origin with transparent bandwidth-only pricing and no per-transform credits or origin-image counts to reason about. Unlike Cloudinary’s bundled credits or imgix’s origin-image model, you pay only for bytes delivered, with a hard cap you control. And it is the only one of the four you can also self-host as open source under AGPL — the identical engine on your own infrastructure — so there is never any vendor lock-in.',
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
      'Modern formats like AVIF and WebP typically cut image weight 40–70% versus the same image as JPEG or PNG, and Keenpix negotiates the best format each browser supports (AVIF → WebP → JPEG) from a single URL. On top of format conversion you get resize, quality, and DPR controls, so you ship exactly the pixels each device needs. Keenpix then reports the exact bytes saved per project in its built-in analytics — and because you are billed on bandwidth delivered, that saving shows up directly on your invoice.',
  },
]
