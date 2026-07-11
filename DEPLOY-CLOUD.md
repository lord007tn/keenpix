# Deploying keenpix cloud (keenpix.com)

The managed multi-tenant SaaS. Self-host operators do **not** need any of this —
this is only for running the hosted product. See `docker-compose.cloud.yml` and
the CLOUD MODE section of `.env.example`.

## Stack

`docker-compose.cloud.yml` brings up:

- **app** — keenpix in `KEENPIX_MODE=cloud` (self-signup, billing, quotas).
- **postgres** — source of truth (users, orgs, projects, subscriptions, rollups).
- **clickhouse** — advanced analytics + full-history logs (advanced tier).
- **maxio** — S3-compatible shared image cache. **Prefer Cloudflare R2** in
  production: point `KEENPIX_CACHE_S3_*` at your R2 bucket and delete this service.
- **usage-cron** — hourly `POST /api/internal/billing/report-usage` (reports
  delivered GB to Polar for overage billing). In Coolify, use a native Scheduled
  Task instead.

## One-time setup

1. **Domain** — buy `keenpix.com`, point DNS at the host, set `SERVICE_URL_APP=https://keenpix.com`.
2. **Email** — pick one provider with `EMAIL_PROVIDER` and verify the sender
   domain. Postmark: `EMAIL_PROVIDER=postmark` + `POSTMARK_API_KEY` +
   `POSTMARK_FROM="Keenpix <no-reply@keenpix.com>"`. Resend:
   `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `RESEND_FROM`. SMTP:
   `EMAIL_PROVIDER=smtp` + `SMTP_HOST` + `SMTP_FROM_EMAIL` (+ auth).
3. **Polar (production org)** —
   - Create the 6 products (basic/pro/business × month/year) with metadata
     `plan`, `interval`, `included_gb`, `overage_per_gb_cents`.
   - Create the `Bandwidth Delivered` meter (sum of `gb` on `bandwidth_delivered`
     events) and, per plan, a `meter_credit` benefit (units = included GB) + a
     `metered_unit` overage price on each product. (Scripts used in sandbox:
     `scripts`/scratchpad `create-meter.mjs`, `overage-setup.mjs`.)
   - Create a webhook endpoint → `https://keenpix.com/api/auth/polar/webhooks`
     (events: `subscription.created`, `subscription.active`,
     `subscription.updated`, `subscription.canceled`,
     `subscription.uncanceled`, and `subscription.revoked`). The `created` event
     is required to mirror trials before they become active. Set
     `POLAR_TOKEN`, `POLAR_SERVER=production`, `POLAR_WEBHOOK_SECRET`.
   - Keep sandbox webhooks off unless an isolated cloud staging callback exists.
     Never point sandbox events at the production `keenpix.com` application.
   - If the Polar dashboard cannot attach existing Meter Credits benefits to
     products, run a dry check inside the cloud app container, then apply only
     after it identifies exactly six products and three benefits:
     `pnpm billing:configure-benefits -- --server=production`, followed by the
     same command with `--apply`. The script preserves any existing benefits,
     refuses ambiguous catalogs, and never prints the access token.
4. **Shared cache** — create a Cloudflare R2 bucket + R2 API token, set the five
   `KEENPIX_CACHE_S3_*` (endpoint `https://<account>.r2.cloudflarestorage.com`,
   region `auto`). Or use the bundled maxio service.
5. **Secrets** — `BETTER_AUTH_SECRET` (openssl rand -hex 32), `CLICKHOUSE_PASSWORD`,
   `CRON_SECRET` (random), Postgres/admin creds (Coolify generates `SERVICE_*`).

## Deploy

```
docker compose -f docker-compose.cloud.yml up -d
```

Migrations run on boot (`KEENPIX_RUN_MIGRATIONS=true`); seeding is off by default
in cloud (`KEENPIX_RUN_SEED=false`). If you migrate existing self-host data first,
run `pnpm tsx scripts/backfill-clickhouse.ts` once so ClickHouse has history.

## Verify after deploy

- `GET /` → marketing home; `GET /api/health` → healthy.
- Sign up → receive the verification email (proves EMAIL_PROVIDER + domain).
- Subscribe to a plan → checkout → after payment, `Subscription` row appears
  (proves the webhook). The billing portal then works.
- Transform an image under a subscribed org → 200; under an unsubscribed org → 402.
- After an hour (or trigger the cron), delivered GB shows on the Polar meter.
