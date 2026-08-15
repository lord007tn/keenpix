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

1. **Domain** — buy `keenpix.com`, point DNS at the host, and set
   `SERVICE_URL_APP=https://keenpix.com`. This stack declares
   `KEENPIX_DEPLOYMENT_ENV=production`; staging must instead use
   `KEENPIX_DEPLOYMENT_ENV=staging` with `POLAR_SERVER=sandbox`.
2. **Email** — pick one provider with `EMAIL_PROVIDER` and verify the sender
   domain. Postmark: `EMAIL_PROVIDER=postmark` + `POSTMARK_API_KEY` +
   `POSTMARK_FROM="Keenpix <no-reply@keenpix.com>"`. Resend:
   `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `RESEND_FROM`. SMTP:
   `EMAIL_PROVIDER=smtp` + `SMTP_HOST` + `SMTP_FROM_EMAIL` (+ auth).
3. **Polar (production org)** —
   - Keep the standard monthly product set for basic/pro/business active. Each
     product carries `plan`, `interval`, `pricing_phase=standard`, `included_gb`,
     and `overage_per_gb_cents`. New application checkout uses only the standard
     $9/$29/$69 set. Founding catalog records may remain for historical
     subscribers and catalog verification, but do not expose direct checkout
     links or advertise a capped cohort until activation-time slots can be
     reserved atomically.
     Set `interval=month`. Archive any older annual products: do not delete them,
     but do not leave public annual checkout links active. Annual checkout is
     intentionally disabled until monthly allowance resets can be reconciled
     with Polar's annual usage period.
   - Configure the `Managed Image Delivery` meter (sum of `gb` on
     `bandwidth_delivered` events), the three fixed monthly prices, their
     metered overages, and catalog metadata with
     `pnpm billing:configure-catalog -- --server=production`. Inspect the dry
     run, then repeat it with `--apply`. The command creates or verifies the
     founding and standard catalog records; the application exposes only the
     standard set to new checkout. Per plan, keep one `meter_credit` benefit
     whose units equal the included GB and attach it to both catalog records.
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
     six monthly catalog products and three benefits:
     `pnpm billing:configure-benefits -- --server=production`, followed by the
     same command with `--apply`. The script preserves any existing benefits,
     refuses ambiguous catalogs, and never prints the access token.
4. **Custom delivery domains** — enable Cloudflare for SaaS and create an
   originless fallback such as `fallback.keenpix.com` (the Worker handles the
   request before that placeholder origin). Deploy `workers/custom-domain-edge`
   as `keenpix-custom-domain-edge`, set its `EDGE_SECRET`, and keep
   `APP_ORIGIN=https://keenpix.com`. Create `customers.keenpix.com` as the CNAME
   target customers use. The application token needs **Zone → SSL and
   Certificates → Edit** and **Zone → Workers Routes → Edit**; a separate deploy
   identity needs **Account → Workers Scripts → Edit**. Set
   `CLOUDFLARE_SAAS_API_TOKEN`, `CLOUDFLARE_SAAS_ZONE_ID`,
   `CLOUDFLARE_SAAS_CNAME_TARGET`, and `CLOUDFLARE_SAAS_EDGE_SECRET` together;
   `CLOUDFLARE_SAAS_WORKER_SCRIPT` defaults to `keenpix-custom-domain-edge`.
   Each customer domain receives an exact Worker route, so Coolify never needs
   arbitrary customer hostnames or certificates. Cache rules for custom hosts
   should match `/img/*` by path rather than a single host.
5. **Edge analytics for billing** — create a zone-scoped token with **Zone →
   Analytics → Read** and a separate account-scoped token with **Account →
   Account Analytics → Read**. Set `CLOUDFLARE_API_TOKEN`,
   `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_ACCOUNT_API_TOKEN`, and
   `CLOUDFLARE_ACCOUNT_ID`. All four are required in cloud mode: project-level
   Analytics Engine capture must succeed before the Polar usage watermark can
   advance. `CLOUDFLARE_HOST` remains an optional zone-analytics filter.
6. **Shared cache** — create a Cloudflare R2 bucket + R2 API token, set the five
   `KEENPIX_CACHE_S3_*` (endpoint `https://<account>.r2.cloudflarestorage.com`,
   region `auto`). Or use the bundled maxio service.
7. **Secrets** — `BETTER_AUTH_SECRET` (openssl rand -hex 32), `CLICKHOUSE_PASSWORD`,
   `CRON_SECRET` (random), Postgres/admin creds (Coolify generates `SERVICE_*`).

## Deploy

The production Coolify application (`keenpix`) currently tracks `master` and
uses `docker-compose.production.yml`. It has no GitHub
webhook, so pushing `master` publishes CI/GHCR artifacts but does **not** redeploy
keenpix.com. Select and deploy the reviewed `master` commit manually in Coolify,
then record the deployment id and smoke-test results. Repository GitHub Actions
run on `ubuntu-latest`; no Blacksmith runner is configured.

For the alternative image-based stack, set `KEENPIX_IMAGE` to a versioned
release tag or immutable digest before running:

```
docker compose -f docker-compose.cloud.yml up -d
```

The Coolify production stack builds the reviewed source commit and ignores
`KEENPIX_IMAGE`. Update its pinned Maxio and cron helper image references
deliberately during a release; do not turn them back into floating `latest`
tags.

Migrations run on boot (`KEENPIX_RUN_MIGRATIONS=true`); seeding is off by default
in cloud (`KEENPIX_RUN_SEED=false`). If you migrate existing self-host data first,
run `pnpm tsx scripts/backfill-clickhouse.ts` once so ClickHouse has history.

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
