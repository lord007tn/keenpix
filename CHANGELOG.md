# Changelog

All notable changes to Keenpix are documented here.

## Unreleased

No unreleased changes.

## [v0.2.0] - 2026-07-11

### Added

- Managed cloud mode with multi-tenant organizations, self-serve signup, email verification, Google OAuth support, and an operator console.
- Polar-backed trials, subscriptions, usage metering, spending caps, billing alerts, dunning handling, and organization-scoped billing recovery.
- Consent-aware GTM/GA4 funnel events and sampled first-party Core Web Vitals reporting with a privacy-choice surface.
- Public pricing, comparison, self-hosting, changelog, trust, security, status, support, author, and editorial-methodology pages.
- A nine-article blog with three focused image-CDN guides, dated primary-source disclosures, RSS, and required article-specific Takumi hero/OG images.
- Opt-in HMAC-signed image URLs, cloud object caching, ClickHouse analytics, daily cloud database backups, and graceful deployment health handling.
- Cross-platform SEO drift checks for canonical, robots, schema, Open Graph, headings, snippets, and status regressions.
- Hourly Postgres analytics rollups with migration backfill and transactional updates when new request logs are written.
- Rollup-based analytics summaries, charts, top images, format/status/domain filters, and dashboard KPI deltas so normal dashboard queries no longer scan raw request logs.
- The overview dashboard now includes recent request activity and instance operations health alongside the analytics cards.
- Analytics and dashboard cards now reconcile Cloudflare edge delivery, Keenpix disk-cache delivery, and live origin processing into one source-split funnel.
- Analytics charts gained edge/origin lenses for funnel, comparison, and Cloudflare-only views.

### Changed

- Relicensed the current self-host engine to AGPL-3.0-only; previously published v0.1.11 and older releases retain their original Apache-2.0 terms.
- Reworked the public experience for narrow mobile layouts, comfortable touch targets, better font discovery, factual metadata/schema, truthful sitemap dates, and canonical apex routing.
- Comparison and pricing copy now distinguishes sourced vendor facts, estimates, product limitations, customer-set caps, and self-host operational responsibility.
- Polar usage events use deterministic idempotency keys, plan changes use the billing portal, and portal sessions resolve from the organization billing customer.
- Postmark failures now log provider status/error codes without leaking recipient details.
- The dashboard and analytics pages now distinguish Cloudflare edge metrics from Keenpix origin-shield metrics so totals and trend badges do not mix incompatible sources.
- Coolify deployments default back to the public `ghcr.io/lord007tn/keenpix:latest` image unless `KEENPIX_IMAGE` is set.

### Fixed

- Corrected misleading Vercel 402, Cloudinary quota, ImageKit custom-domain, migration-URL, and unsupported universal image-savings claims.
- Added missing Polar trial/uncancel webhook documentation and prevented duplicate checkout-based plan switches.
- Fixed public header overflow at 320–412px through compact navigation and intrinsic-width containment.

## [v0.1.7] - 2026-06-13

### Added

- Optional Cloudflare edge-cache analytics using the Cloudflare GraphQL Analytics API.
- A Settings -> CDN cache panel for storing an encrypted Cloudflare API token, Zone ID, and optional image hostname.
- Linked-entity JSON-LD, shared error pages, shared 404 handling, and documentation Open Graph image routes.

### Changed

- Analytics can now show Cloudflare edge hit-rate, edge requests, bytes served from the edge, and hourly hit/miss split for `/img/*`.
- Edge analytics use a fixed last-24-hours window to match the Cloudflare adaptive dataset limit on non-enterprise plans.

## [v0.1.6] - 2026-06-12

### Added

- Project Settings gained richer pipeline, allowed-host, and operations configuration surfaces.
- Analytics gained source-domain capture, filtering, and per-project source-domain breakdowns.
- Operations now shows real cache hit-rate and reasserts persisted cache caps when loading health data.
- The user menu now surfaces the app version.

### Changed

- Replaced the previous app sidebar with the current top-tab command-center navigation.
- Disk cache eviction now uses an index and directory sharding for faster large-cache maintenance.
- Runtime cache caps can be managed from the app instead of only through environment variables.

## [v0.1.5] - 2026-06-10

### Added

- IPX-style Sharp modifiers for geometry, color, effects, extra formats, and animation controls.
- SVG output optimization through SVGO with explicit `fmt=svg` support.
- SSE-backed live logs streamed from the server.
- Operations health for disk cache, memory cache, and transform queue pressure.
- Playwright smoke coverage and a fresh smoke dev-server flow.
- Expanded reference documentation for endpoint parameters, responses, SDK API, operations, and deployment presets.

### Changed

- Improved image delivery p95 with disk-cache and transform-path performance work.
- SDK handlers and server modules were reorganized around clearer boundaries.
- Docker builds now use an Alpine image and improved layer caching.
- Release-note generation now uses changelogithub defaults and includes conventional commit categories.

### Fixed

- SVGO runtime dependencies are kept external so optimized SVG handling works in production builds.
- SVG auto-format behavior is documented correctly: `fmt=auto` rasterizes, while `fmt=svg` preserves SVG output.

## [v0.1.4] - 2026-06-05

### Added

- Project-scoped analytics and per-domain breakdowns.
- GitHub release automation through changelogithub.

### Changed

- Analytics aggregations were made faster for project-scoped views.
- Date handling now uses inline `dayjs` calls and product code avoids trivial formatter/helper wrappers.

## [v0.1.3] - 2026-06-03

### Added

- Internal API keys are now created from a modal with a one-time key reveal instead of an inline form.
- SMTP settings gained a **Test** dialog for sending a test email to a chosen recipient.
- API key **activity** is recorded and shown under **Workspace → API Keys** (method, path, status, latency).
- The dashboard sidebar version links to the GitHub releases page.

### Changed

- Analytics format and status filters now list only the values present in the selected window, matching Live Logs — no empty filter menus.
- Live Logs: **Clear** now also clears the path search, the path search has an inline clear button, and the request **Path** column is wider.
- Workspace tabs (Staff, Email, API Keys) now update the URL so links and refreshes keep the active tab.
- SMTP **Save** is enabled only when there are unsaved changes.
- Staff roles display human-readable labels (for example, "Super admin").
- Security and documentation copy now scopes "no API key" to transform URLs; internal API keys exist for the management API.

### Fixed

- The mobile **Staff** layout no longer overflows horizontally.

## [v0.1.2] - 2026-06-02

### Added

- Added Better Auth API key support for trusted internal integrations.
- Added a super-admin **Workspace → API Keys** panel to create, copy, list, and disable internal API keys.
- Added `/api/sdk/*` project management endpoints for listing, creating, reading, updating settings, and adding/removing allowed domains.

### Changed

- Kept the public `/img/*` transform endpoint headerless and allowlist-gated; internal API keys are only for product-management API calls.

## [v0.1.1] - 2026-06-01

### Changed

- Reorganized settings into clearer surfaces. Global workspace settings (staff management and email/SMTP) moved out of project Settings into a dedicated **Workspace** area reached from the user menu (super admins only).
- Project **Settings** is now scoped to a single project — General, Pipeline, and Security — in a tabbed layout.
- Consolidated SMTP configuration and the delivery check into one card: edit the connection, then save or send a test email from the same place.
- Trimmed the **Account** page to Profile and Appearance, removing the duplicated security and workspace cards.

## [v0.1.0] - 2026-06-01

Initial public release for self-hosting.

### Added

- Self-hostable image optimization service with PostgreSQL-backed projects, request logs, analytics, and admin settings.
- CDN-friendly image transform endpoint at `/img/<source-url>` with width, quality, format, fit, and DPR parameters.
- Cloudflare/self-hosting CDN documentation, including cache-rule guidance for Cloudflare and non-Cloudflare proxies.
- Docker image publishing through GHCR for `latest`, `v0.1`, and `v0.1.0` tags.
- Project configuration UI for allowed hosts, default quality, default format, and cache TTL.
- Admin SMTP and staff invitation management.

### Changed

- Replaced the early `/api/keenpix?url=...` optimizer endpoint with the cleaner `/img/<source-url>` path format.
- Hardened form validation with shared schemas and clearer validation errors across project, auth, invite, and admin flows.
- Improved release automation so GitHub releases are created from this changelog.

### Verified

- CI passes lint, typecheck, tests, and production build.
- Docker workflow builds and publishes the self-host image.
