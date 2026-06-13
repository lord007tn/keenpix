# Analytics roadmap

Future analytics should continue on **Postgres rollups first**. ClickHouse is
an optional high-volume sink, not a prerequisite: raw request logs are kept for
live/debug views, while dashboard analytics read pre-aggregated hourly rows.

What is **already real** today (all project-scoped via `?project=` +
time-windowed):

- ✅ Hourly Postgres rollups maintained alongside raw `request_logs`
- ✅ Requests, bandwidth saved + savings %, cache hit-rate from rollups
- ✅ Format distribution (AVIF/WebP/JPEG/PNG)
- ✅ Approximate latency p50 / p95 / p99 + histogram from rollup buckets
- ✅ Top images by request count
- ✅ Per-project 24h rollup on the dashboard cards
- ✅ Dashboard KPI deltas against the previous equal-length window
- ✅ Source-domain capture, filtering, and per-project breakdowns via `sourceHost`
- ✅ Optional Cloudflare GraphQL edge-cache analytics for `/img/*` traffic
- ✅ Edge/origin source-split funnel cards on Overview and Analytics
- ✅ Real disk and memory cache storage stats in Operations
- ✅ SSE-backed Live Logs updates without client-side polling

> Removed in the trust pass because they were **fixtures**: L1-memory cache fill,
> variant count, geographic map, and $ cost.
> Bringing those back should wait until the next rollup/backfill pass has real
> data sources for them.

---

## Next Postgres Rollup Milestones

- [ ] **Per-URL Cloudflare edge analytics.** The built-in Cloudflare GraphQL
      rollup is zone/host-level and fixed to the last 24h. For project-level
      edge attribution and top miss URLs, ingest Logpush HTTP request records
      or a ClickHouse-backed analytics feed filtered to `/img/*`. Capture
      `CacheCacheStatus`, `CacheResponseBytes`, `CacheTieredFill`,
      `CacheReserveUsed`, `ClientRequestHost`, `ClientRequestPath`, and
      `ClientRequestURI`, then join by parsed `project` query value. This should
      power per-project edge breakdowns and per-URL edge-hit/miss analysis.
      *Effort: L.*
- [ ] **Geographic distribution.** *Data:* populate `RequestLog.country/region`
      (currently always null) from a CDN/proxy header (`CF-IPCountry`,
      `X-Vercel-IP-Country`) or a GeoIP lookup. *Code:* `getGeoDistribution` by country.
      Restores the geo card with honest data. *Effort: M.*
- [ ] **Daily and weekly rollup tables.** Hourly rollups are enough for current
      views. Add daily/weekly tables before raw logs are retained for less than
      the full 90-day dashboard window. *Effort: M.*
- [ ] **Raw-log retention job.** Keep raw `request_logs` for a bounded window
      such as 14-30 days, then prune after hourly/daily rollups are complete.
      *Effort: M.*
- [ ] **Latency trend over time** — p50/p95/p99 per time-bucket from latency
      bucket columns, not just the window total. *Effort: M.*
- [ ] **Status / error breakdown** — 2xx/4xx/5xx rate over time; surface
      403/404/502 spikes (abuse / misconfig signal). *Effort: M.*
- [ ] **Top images by delivered bytes** — `sum(bytesOut)` by path (today it's by count). *Effort: S.*
- [ ] **Bandwidth-saved over time** + cumulative, and a per-format savings breakdown. *Effort: M.*
- [ ] **Cache efficiency by image** — hit-rate per path; flag never-cached / thrashing paths. *Effort: M.*
- [ ] **Requested size/DPR distribution** — which widths/dprs are hit (informs srcset pre-warming). *Effort: S.*
- [ ] **Optional ClickHouse sink** — only for very high-volume installs that
      outgrow Postgres rollup maintenance or need ad-hoc raw-log analytics.
      *Effort: L.*
- [ ] **Scheduled exports / reports** — CSV alongside the existing NDJSON export; optional
      emailed weekly summary. *Effort: M.*
- [ ] **Per-project quotas + alerts** — usage thresholds and an alert on error-rate /
      latency spikes (SaaS-ready). *Effort: L.*

## Cross-cutting data-model prerequisites

Several deferred items need richer capture at write time in `createRequestLog`
(`handle-transform.ts`): populate **`country`/`region`**, and consider capturing
**`referer`** (hotlink analytics) and **`userAgent`**. Add these as a single
Prisma migration before building the dependent charts.
