# Deploying keenpix cloud (keenpix.com)

The managed multi-tenant SaaS. Self-host operators do **not** need any of this —
this is only for running the hosted product. `docker-compose.cloud.yml` is the
portable reference stack; the live Coolify resource uses the volume-compatible
`docker-compose.production.yml`. See the CLOUD MODE section of `.env.example`.

## Stack

`docker-compose.cloud.yml` brings up:

- **app** — keenpix in `KEENPIX_MODE=cloud` (self-signup, billing, quotas).
- **postgres** — source of truth (users, orgs, projects, subscriptions, rollups).
- **clickhouse** — advanced analytics + full-history logs (advanced tier).
- **maxio** — S3-compatible shared image cache. **Prefer Cloudflare R2** in
  production: point `KEENPIX_CACHE_S3_*` at your R2 bucket and delete this service.
- **usage-cron** — hourly `POST /api/internal/billing/report-usage` (captures
  project-attributed Cloudflare edge delivery, combines it with application
  responses without double-counting, and reports managed-delivery GB to Polar).
  In Coolify, use a native Scheduled Task instead.

## One-time setup

1. **Domain** — buy `keenpix.com`, point DNS at the host, set `SERVICE_URL_APP=https://keenpix.com`.
2. **Email** — pick one provider with `EMAIL_PROVIDER` and verify the sender
   domain. Postmark: `EMAIL_PROVIDER=postmark` + `POSTMARK_API_KEY` +
   `POSTMARK_FROM="Keenpix <no-reply@keenpix.com>"`. Resend:
   `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `RESEND_FROM`. SMTP:
   `EMAIL_PROVIDER=smtp` + `SMTP_HOST` + `SMTP_FROM_EMAIL` (+ auth).
3. **Polar (production org)** —
   - Keep two monthly product sets for basic/pro/business: `founding` and
     `standard`. Each product carries `plan`, `interval`, `pricing_phase`,
     `included_gb`, and `overage_per_gb_cents`. The application exposes the
     founding set until 25 real paying Polar organizations have become active,
     then switches checkout to the standard set. Founding Basic/Pro/Business is
     $9/$19/$39 with $0.08/$0.06/$0.05 per delivered GB of overage; standard is
     $9/$29/$69 with $0.12/$0.09/$0.07. Trials and local admin grants never
     claim a founding slot, and churn does not reopen one.
     Set `interval=month`. Archive any older annual products: do not delete them,
     but do not leave public annual checkout links active. Annual checkout is
     intentionally disabled until monthly allowance resets can be reconciled
     with Polar's annual usage period.
   - Configure the `Managed Image Delivery` meter (sum of `gb` on
     `bandwidth_delivered` events), the three fixed monthly prices, their
     metered overages, and catalog metadata with
     `pnpm billing:configure-catalog -- --server=production`. Inspect the dry
     run, then repeat it with `--apply`. The command migrates the legacy three
     products to the founding set and creates/verifies the three standard
     products. Per plan, keep one `meter_credit` benefit whose units equal the
     included GB and attach it to both pricing phases.
   - Founding products carry `price_lock_months=12` as catalog metadata and the
     public promise is "at least 12 months." That metadata is descriptive: no
     scheduler, webhook handler, or Polar product migration automatically moves
     a founding subscription to standard pricing after month 12. Do not describe
     the transition as automatic unless that workflow is implemented and tested.
   - Create a webhook endpoint → `https://keenpix.com/api/auth/polar/webhooks`
     (events: `subscription.created`, `subscription.active`,
     `subscription.updated`, `subscription.canceled`,
     `subscription.uncanceled`, and `subscription.revoked`). The `created` event
     is required to mirror trials before they become active. Set
     `POLAR_TOKEN`, `POLAR_SERVER=production`, `POLAR_WEBHOOK_SECRET`.
   - Create the sandbox webhook endpoint at
     `https://keenpix.com/api/auth/polar/sandbox-webhooks` and set its distinct
     secret as `POLAR_SANDBOX_WEBHOOK_SECRET`. This apex callback only verifies
     and acknowledges sandbox delivery; it deliberately cannot sync production
     entitlements. Subscribe it to the same six subscription events for callback
     parity. Never reuse `POLAR_WEBHOOK_SECRET` for it.
   - To verify and attach the included managed-delivery credits, run a dry check
     inside the cloud app container, then apply only after it identifies exactly
     six monthly products and three benefits:
     `pnpm billing:configure-benefits -- --server=production`, followed by the
     same command with `--apply`. The script preserves any existing benefits,
     refuses ambiguous catalogs, and never prints the access token.
4. **Custom delivery domains** — enable Cloudflare for SaaS and create an
   originless fallback such as `fallback.keenpix.com` (the Worker handles the
   request before that placeholder origin). Deploy `apps/custom-domain-edge`
   as `keenpix-custom-domain-edge`, set its `EDGE_SECRET`, and keep
   `TRANSFORM_ORIGIN=https://transform.keenpix.com`. Create `customers.keenpix.com` as the CNAME
   target customers use. The application token needs **Zone → SSL and
   Certificates → Edit** and **Zone → Workers Routes → Edit**; a separate deploy
   identity needs **Account → Workers Scripts → Edit**. Set
   `CLOUDFLARE_SAAS_API_TOKEN`, `CLOUDFLARE_SAAS_ZONE_ID`,
   `CLOUDFLARE_SAAS_CNAME_TARGET`, and `CLOUDFLARE_SAAS_EDGE_SECRET` together;
   `CLOUDFLARE_SAAS_WORKER_SCRIPT` defaults to `keenpix-custom-domain-edge`.
   Each customer domain receives an exact Worker route, so Coolify never needs
   arbitrary customer hostnames or certificates. Cache rules for custom hosts
   should match `/img/*` by path rather than a single host.
5. **Shared cache** — create a Cloudflare R2 bucket + R2 API token, set the five
   `KEENPIX_CACHE_S3_*` (endpoint `https://<account>.r2.cloudflarestorage.com`,
   region `auto`). Or use the bundled maxio service.
6. **Secrets** — `BETTER_AUTH_SECRET` (openssl rand -hex 32), `CLICKHOUSE_PASSWORD`,
   `CRON_SECRET` (random), Postgres/admin creds (Coolify generates `SERVICE_*`).

## Deploy

The production Coolify application (`keenpix`) currently tracks `master` and
uses `docker-compose.production.yml`. It has no GitHub
webhook, so pushing `master` publishes CI/GHCR artifacts but does **not** redeploy
keenpix.com. Select and deploy the reviewed `master` commit manually in Coolify,
then record the deployment id and smoke-test results. Repository GitHub Actions
run on `ubuntu-latest`; no Blacksmith runner is configured.

```
docker compose -f docker-compose.cloud.yml up -d
```

Migrations run on boot (`KEENPIX_RUN_MIGRATIONS=true`); seeding is off by default
in cloud (`KEENPIX_RUN_SEED=false`). If you migrate existing self-host data first,
run `pnpm --filter @keenpix/app exec tsx scripts/backfill-clickhouse.ts` once so ClickHouse has history.

## Verify after deploy

- `GET /` → marketing home; `GET /api/health` → healthy.
- Sign up → receive the verification email (proves EMAIL_PROVIDER + domain).
- Subscribe to a plan → checkout → after payment, `Subscription` row appears
  (proves the webhook). The billing portal then works.
- Transform an image under a subscribed org → 200; under an unsubscribed org → 402.
- On Pro or Business, add a custom domain, create the displayed CNAME record,
  refresh until DNS and TLS are active, then load `/img/<source-url>` on that
  hostname without `?project=`.
- After an hour (or trigger the cron), application responses plus successful
  Cloudflare edge hits show on the Polar managed-delivery meter exactly once.
