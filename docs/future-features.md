# Future Features

This backlog captures product and platform ideas found during the cleanup pass.
Keep implementation out of the core refactor unless the item becomes a committed
roadmap task.

## Analytics

Deferred until the ClickHouse analytics phase:

- Geo distribution from trusted proxy headers such as `CF-IPCountry` or an
  explicit GeoIP integration.
- Error-rate and status-code trends over time.
- Latency percentiles per time bucket instead of only whole-window percentiles.
- Top images by delivered bytes and by cache hit rate.
- Retention and pre-aggregated analytics rollups before `request_logs` grows too
  large for direct Postgres aggregation.
- Optional ClickHouse sink for high-volume analytics.

## Platform

- S3/R2-compatible object storage cache backend for multi-node self-hosting.
- Per-project quotas and soft-limit alerts for SaaS readiness.
- Webhook delivery for log events and operational alerts.

## Developer Experience

- Additional Playwright coverage for live logs, operations cache controls, and
  settings updates.
