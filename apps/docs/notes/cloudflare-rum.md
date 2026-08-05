# Cloudflare Web Analytics RUM

The `keenpix.com` Cloudflare Web Analytics site uses automatic beacon injection
with Real User Measurements enabled for all visitors, including the EU. It is
the production source for public page views, page-load timing, and field Core
Web Vitals such as LCP, INP, and CLS.

Cloudflare RUM is cookie-free and independent of the Keenpix Google consent
choice. The visible privacy dialog controls GTM/GA4 cookies and funnel events;
declining Google analytics does not disable the Cloudflare performance beacon.

Cloudflare RUM is not product analytics. The customer dashboard's image
requests, successful deliveries, cache hits, optimized deliveries, bytes
delivered/saved, latency, and recorded failures come from organization- and
project-scoped Keenpix request logs and Postgres rollups. Optional Cloudflare
GraphQL edge-cache figures are whole-zone/host aggregates, operator-only in
cloud mode, and cannot be attributed to a tenant with the current query-string
project identifier.

Operational checks:

1. Cloudflare Web Analytics site hostname is `keenpix.com`.
2. RUM is set to **Enable**, with automatic JavaScript injection.
3. A fresh public page response contains Cloudflare's beacon injection and the
   Web Analytics dashboard begins receiving page/performance data.
4. The application does not load the removed `/api/web-vitals` collector.
5. Tenant image totals are verified against Keenpix rollups, never copied from
   Web Analytics.
