# Changelog

All notable changes to Keenpix are documented here.

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
