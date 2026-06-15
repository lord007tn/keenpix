# Future Features

This backlog captures product and platform ideas found during the cleanup pass.
Keep implementation out of the core refactor unless the item becomes a committed
roadmap task.

## Analytics

Shipped since this backlog: hourly Postgres rollups (`AnalyticsRollupHourly`)
aggregated in SQL, persisted zone/host-wide Cloudflare edge rollups
(`EdgeRollupHourly`, so edge works beyond Cloudflare's ~24h window), geo
distribution (`CF-IPCountry`), status-class trends over time, per-time-bucket
latency percentiles, and top images by delivered bytes.

Still future, building on those:

- Per-URL and per-project Cloudflare edge attribution from Logpush or a richer
  edge-ingest pipeline. Edge data is persisted but zone/host-wide — Cloudflare
  cannot attribute `/img/*` traffic to a keenpix project, so per-URL and
  per-project edge breakdowns still need Logpush (or similar).
- Top images ranked by cache hit-rate (by request count and delivered bytes ship today).
- Daily/weekly rollup tables and a raw-log retention job once installs need to
  prune `request_logs` (hourly rollups ship today; coarser tables and the
  retention job are still future).
- A scheduled (cron/boot) edge capture so history keeps accumulating even when
  the dashboard goes unvisited for >24h (capture is opportunistic today).
- Optional ClickHouse sink for unusually high-volume analytics.

## Platform

- S3/R2-compatible object storage cache backend for multi-node self-hosting.
- Per-project quotas and soft-limit alerts for SaaS readiness.
- Webhook delivery for log events and operational alerts.

## Developer Experience

- Additional Playwright coverage for live logs, operations cache controls, and
  settings updates.
