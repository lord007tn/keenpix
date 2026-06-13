# Analytics roadmap

Future analytics to support after the ClickHouse phase. Keep the current
Postgres-backed analytics focused on operational essentials and avoid adding
more high-cardinality or expensive aggregations until the ingestion/storage
model changes.

What is **already real** today (all project-scoped via `?project=` +
time-windowed):

- ✅ Requests, bandwidth saved + savings %, cache hit-rate
- ✅ Format distribution (AVIF/WebP/JPEG/PNG)
- ✅ Latency p50 / p95 / p99 + histogram (computed from real `latencyMs`)
- ✅ Top images by request count
- ✅ Per-project 24h rollup on the dashboard cards
- ✅ Dashboard KPI deltas against the previous equal-length window
- ✅ Source-domain capture, filtering, and per-project breakdowns via `sourceHost`
- ✅ Real disk and memory cache storage stats in Workspace operations
- ✅ SSE-backed Live Logs updates without client-side polling

> Removed in the trust pass because they were **fixtures**: L1-memory cache fill,
> variant count, geographic map, and $ cost.
> Bringing those back should wait until the ClickHouse-backed analytics pass.

---

## Deferred until ClickHouse

- [ ] **Cloudflare edge-cache analytics.** Keenpix request logs only measure
      requests that reach the origin; Cloudflare edge hits never hit the app.
      Add a separate Cloudflare source, preferably Logpush HTTP request records
      or GraphQL/Cache Analytics rollups, filtered to `/img/*`. Capture
      `CacheCacheStatus`, `CacheResponseBytes`, `CacheTieredFill`,
      `CacheReserveUsed`, `ClientRequestHost`, `ClientRequestPath`, and
      `ClientRequestURI`, then join by parsed `project` query value. This should
      power an "Edge cache" card alongside the current origin-shield cache card.
      *Effort: L.*
- [ ] **Geographic distribution.** *Data:* populate `RequestLog.country/region`
      (currently always null) from a CDN/proxy header (`CF-IPCountry`,
      `X-Vercel-IP-Country`) or a GeoIP lookup. *Code:* `getGeoDistribution` by country.
      Restores the geo card with honest data. *Effort: M.*
- [ ] **Latency trend over time** — p50/p95/p99 per time-bucket (not just the window total). *Effort: M.*
- [ ] **Status / error breakdown** — 2xx/4xx/5xx rate over time; surface 403/404/502
      spikes (abuse / misconfig signal). *Effort: M.*
- [ ] **Top images by delivered bytes** — `sum(bytesOut)` by path (today it's by count). *Effort: S.*
- [ ] **Bandwidth-saved over time** + cumulative, and a per-format savings breakdown. *Effort: M.*
- [ ] **Cache efficiency by image** — hit-rate per path; flag never-cached / thrashing paths. *Effort: M.*
- [ ] **Requested size/DPR distribution** — which widths/dprs are hit (informs srcset pre-warming). *Effort: S.*
- [ ] **ClickHouse for analytics (PLAN Phase 9)** — move `request_logs` ingestion +
      aggregation to ClickHouse once Postgres `groupBy` over the log table gets slow. *Effort: L.*
- [ ] **Retention + pre-aggregated rollups** — daily/monthly summary tables; prune raw
      logs after N days (keeps the table — and aggregations — fast). *Effort: M.*
- [ ] **Scheduled exports / reports** — CSV alongside the existing NDJSON export; optional
      emailed weekly summary. *Effort: M.*
- [ ] **Per-project quotas + alerts** — usage thresholds and an alert on error-rate /
      latency spikes (SaaS-ready). *Effort: L.*

## Cross-cutting data-model prerequisites

Several deferred items need richer capture at write time in `insertRequestLog`
(`handle-transform.ts`): populate **`country`/`region`**, and consider capturing
**`referer`** (hotlink analytics) and **`userAgent`**. Add these as a single
Prisma migration as part of the ClickHouse analytics phase before building the
dependent charts.
