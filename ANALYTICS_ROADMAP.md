# Analytics roadmap

Future analytics to support, as todos. Builds on what's **already real** today
(all project-scoped via `?project=` + time-windowed):

- ✅ Requests, bandwidth saved + savings %, cache hit-rate
- ✅ Format distribution (AVIF/WebP/JPEG/PNG)
- ✅ Latency p50 / p95 / p99 + histogram (computed from real `latencyMs`)
- ✅ Top images by request count
- ✅ Per-project 24h rollup on the dashboard cards
- ✅ Dashboard KPI deltas against the previous equal-length window
- ✅ Source-domain capture, filtering, and per-project breakdowns via `sourceHost`
- ✅ Real disk and memory cache storage stats in Workspace operations

> Removed in the trust pass because they were **fixtures**: L1-memory cache fill,
> variant count, geographic map, and $ cost.
> The Tier-1 items below are about bringing those back as **real** data.

---

## Tier 1 — make the removed fixtures real (highest value)

- [ ] **Geographic distribution.** *Data:* populate `RequestLog.country/region`
      (currently always null) from a CDN/proxy header (`CF-IPCountry`,
      `X-Vercel-IP-Country`) or a GeoIP lookup. *Code:* `getGeoDistribution` by country.
      Restores the geo card with honest data. *Effort: M.*
## Tier 2 — new dimensions

- [ ] **Latency trend over time** — p50/p95/p99 per time-bucket (not just the window total). *Effort: M.*
- [ ] **Status / error breakdown** — 2xx/4xx/5xx rate over time; surface 403/404/502
      spikes (abuse / misconfig signal). *Effort: M.*
- [ ] **Top images by delivered bytes** — `sum(bytesOut)` by path (today it's by count). *Effort: S.*
- [ ] **Bandwidth-saved over time** + cumulative, and a per-format savings breakdown. *Effort: M.*
- [ ] **Cache efficiency by image** — hit-rate per path; flag never-cached / thrashing paths. *Effort: M.*
- [ ] **Requested size/DPR distribution** — which widths/dprs are hit (informs srcset pre-warming). *Effort: S.*

## Tier 3 — scale & ops

- [ ] **ClickHouse for analytics (PLAN Phase 9)** — move `request_logs` ingestion +
      aggregation to ClickHouse once Postgres `groupBy` over the log table gets slow. *Effort: L.*
- [ ] **Real-time log streaming (SSE)** — replace the 5s `router.invalidate` poll on
      `/app/logs` with a Server-Sent-Events route handler over the live insert stream. *Effort: M.*
- [ ] **Retention + pre-aggregated rollups** — daily/monthly summary tables; prune raw
      logs after N days (keeps the table — and aggregations — fast). *Effort: M.*
- [ ] **Scheduled exports / reports** — CSV alongside the existing NDJSON export; optional
      emailed weekly summary. *Effort: M.*
- [ ] **Per-project quotas + alerts** — usage thresholds and an alert on error-rate /
      latency spikes (SaaS-ready). *Effort: L.*

## Cross-cutting data-model prerequisites

Several Tier-1/2 items need richer capture at write time in `insertRequestLog`
(`handle-transform.ts`): populate **`country`/`region`**, and consider capturing
**`referer`** (hotlink analytics) and **`userAgent`**. Add these as a single
Prisma migration before building the dependent charts.
