# Changelog

All notable changes to Keenpix are documented here.

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
