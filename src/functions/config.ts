import { createServerFn } from '@tanstack/react-start'
import { isCloud } from '@/server/deployment'
import { MARKETING_FAQ } from '@/shared/marketing-faq'
import {
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from '@/shared/seo'

// Public config used by the landing route before an authenticated app session
// exists. Self-hosted deployments skip the marketing site.
//
// The marketing JSON-LD is precomputed here (server-side) and handed to the
// route via loader data so the client hydrates the identical serialized value.
// The nodes embed getAppUrl(), which reads server-only env (BETTER_AUTH_URL /
// KEENPIX_APP_URL); recomputing them in the browser resolves to the localhost
// fallback and produces a different <script> body, which is exactly the
// hydration mismatch we avoid by serializing the server-built array.
export const getPublicConfigFn = createServerFn({ method: 'GET' }).handler(
  () => {
    // The public SaaS marketing/SEO surface belongs to cloud only, so everything
    // keys off isCloud(). Self-host (!cloud) shows the minimal self-host home.
    const cloud = isCloud()
    return {
      cloud,
      jsonLd: cloud
        ? [
            softwareApplicationJsonLd(),
            organizationJsonLd(),
            webSiteJsonLd(),
            faqPageJsonLd(MARKETING_FAQ),
          ]
        : null,
    }
  },
)
