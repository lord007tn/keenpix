export const IMAGE_CDN_PRICING = {
  currency: 'USD',
  verifiedAt: '2026-08-22',
  nextReviewAt: '2026-10-22',
  methodology:
    'Public self-serve prices only. Taxes, contracts, legacy plans, platform fees, delivery outside the stated meter, and vendor-specific feature charges are excluded unless a row says otherwise.',
  vendors: [
    {
      id: 'keenpix',
      name: 'Keenpix',
      source: 'https://keenpix.com/pricing',
      note: 'Managed delivery only; unlimited transforms and team members.',
    },
    {
      id: 'cloudinary',
      name: 'Cloudinary',
      source: 'https://cloudinary.com/pricing',
      note: 'One pooled credit is 1 GB bandwidth, 1 GB storage, or 1,000 transforms.',
    },
    {
      id: 'imgix',
      name: 'imgix',
      source: 'https://www.imgix.com/pricing',
      note: 'Estimate uses delivery and management credits; feature-specific transform credits are excluded.',
    },
    {
      id: 'imagekit',
      name: 'ImageKit',
      source: 'https://imagekit.io/plans',
      note: 'Estimate uses published delivery and media-storage allowances and overage.',
    },
    {
      id: 'gumlet',
      name: 'Gumlet Image',
      source: 'https://www.gumlet.com/pricing/image/',
      note: 'Image-only public plans; video products are outside this comparison.',
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Images',
      source: 'https://developers.cloudflare.com/images/pricing/',
      note: 'Remote-origin transformation estimate only; hosted-image storage and delivery are excluded.',
    },
    {
      id: 'bunny',
      name: 'Bunny Optimizer',
      source: 'https://bunny.net/pricing/optimizer/',
      note: 'Optimizer site fee plus the selected public Bunny CDN regional rate.',
    },
    {
      id: 'vercel',
      name: 'Vercel Image Optimization',
      source: 'https://vercel.com/docs/image-optimization/limits-and-pricing',
      note: 'Image meters only; plan, Fast Data Transfer, and Edge Request charges are excluded.',
    },
    {
      id: 'imgproxy',
      name: 'imgproxy',
      source: 'https://imgproxy.net/pricing',
      note: 'License price only; infrastructure, CDN, storage, monitoring, and operations remain yours.',
    },
  ],
} as const

export const IMAGE_CDN_CALCULATOR_FAQ = [
  {
    q: 'Why are some estimates marked partial?',
    a: 'Some products bill for more than image delivery. The calculator marks a result partial when public inputs cannot represent plan fees, regional delivery, feature-specific transforms, infrastructure, or negotiated contracts without inventing a total.',
  },
  {
    q: 'How are Cloudinary credits estimated?',
    a: 'The model adds delivered GB, source-storage GB, and one credit per 1,000 unique transforms, then selects the smallest published self-serve credit package that covers the total. Other Cloudinary products and negotiated terms are excluded.',
  },
  {
    q: 'Does the lowest number mean the best product?',
    a: 'No. Products have different boundaries: some include storage, DAM, video, or a platform; others are image-only or self-hosted. Use the estimate to identify questions for a vendor quote, then compare capabilities and operational work.',
  },
  {
    q: 'Can I share a scenario?',
    a: 'Yes. Calculate a scenario and copy the resulting URL. Inputs are stored in its query string, not sent to Keenpix as a lead form.',
  },
] as const
