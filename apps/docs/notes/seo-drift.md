# SEO drift deployment gate

The project-owned drift command runs on Windows and Linux with Node.js. It
captures status, title, description, canonical, robots, headings, Open Graph,
and JSON-LD, then compares a deployment with the stored known-good snapshot.

```bash
pnpm seo:drift baseline https://keenpix.com artifacts/seo-baseline.json
pnpm seo:drift compare https://keenpix.com artifacts/seo-baseline.json
```

`compare` exits non-zero for canonical, accidental `noindex`, schema, title,
description, H1, status, or Open Graph regressions. A raw HTML hash change is
informational when parsed SEO fields remain stable. The fetcher permits only
the Keenpix apex and `www` hosts, checks resolved addresses, follows at most five
validated redirects, and never disables TLS verification.

Capture the production baseline only after the cloud deployment owns the target
host. Until the cloud cutover is explicit, do not run this command against a
host served by legacy production.
