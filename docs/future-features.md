# Future Features

This backlog captures product and platform ideas found during the cleanup pass.
Keep implementation out of the core refactor unless the item becomes a committed
roadmap task.

## Analytics

Shipped since this backlog: durable hourly Postgres rollups (`AnalyticsRollupHourly`)
aggregated in SQL, persisted zone/host-wide Cloudflare edge rollups
(`EdgeRollupHourly`, so edge works beyond Cloudflare's ~24h window), geo
distribution (`CF-IPCountry`), status-class trends over time, per-time-bucket
latency percentiles, top images by delivered bytes, scheduled hourly edge
capture, 365-day/all-time/custom windows, and filtered CSV export.

Still future, building on those:

- Per-URL and per-project Cloudflare edge attribution from Logpush or a richer
  edge-ingest pipeline. Edge data is persisted but zone/host-wide — Cloudflare
  cannot attribute `/img/*` traffic to a keenpix project, so per-URL and
  per-project edge breakdowns still need Logpush (or similar).
- Top images ranked by cache hit-rate (by request count and delivered bytes ship today).
- Daily/monthly rollup compaction if production volume proves that the durable
  hourly table needs a second aggregation tier. Raw-log retention already ships;
  long chart windows are bounded before reaching the browser.
- Optional ClickHouse sink for unusually high-volume analytics.

## Platform

- S3/R2-compatible object storage cache backend for multi-node self-hosting.
- Per-project quotas and soft-limit alerts for SaaS readiness.
- Webhook delivery for log events and operational alerts.

## Developer Experience

- Additional Playwright coverage for live logs, operations cache controls, and
  settings updates.
