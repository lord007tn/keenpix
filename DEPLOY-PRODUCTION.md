# Deploying Keenpix production on Coolify

**This compose file runs the production keenpix.com deployment** (Coolify
application `keenpix` under the **Raed** project, deployed manually from
`master`). The app is built locally because its public URL and analytics IDs are
browser build-time configuration. Transform, worker, and docs pull the released
GHCR images selected by `KEENPIX_RUNTIME_IMAGE_TAG` instead of rebuilding the
monorepo three more times on the production host. The application has no GitHub
webhook: pushing `master` does not deploy production. The stack includes the
app, Postgres, ClickHouse, an S3-compatible cache, Mailpit (used only as a
non-production email sink), the hourly usage cron, and a daily Postgres backup
job.

## Coolify resource

1. Open `https://coolify.joodlab.com/` and log in.
2. Go to the **Raed** project.
3. Open the existing `keenpix` application.
4. Build Pack: **Docker Compose**.
5. Branch: `master`.
6. Base Directory: `/`.
7. Docker Compose Location: `docker-compose.production.yml`.
8. Resource name: `keenpix`.

After a reviewed change reaches `master`, manually redeploy that exact commit in
Coolify and record the deployment id. The repository's GitHub Actions run on
`ubuntu-latest`; no Blacksmith runner is configured.

Set `KEENPIX_RUNTIME_IMAGE_TAG` to the matching published release tag (for
example, `v0.3.0`) before deploying a release. The three runtime images are
published only by the manual Docker workflow; pull and manifest verification
must pass before production is updated. The default is `v0.3.0` for the first
monorepo release.

Coolify's Docker Compose docs say to route non-80 app ports by assigning the
domain to the service with the container port. This compose file uses
`SERVICE_URL_APP_3000`, so Coolify will generate and route the app URL to port
`3000`. Mailpit uses `SERVICE_URL_MAILPIT_8025` for the email inbox UI.

## Required environment variables

Set these in Coolify before deploying:

```dotenv
KEENPIX_APP_URL=https://keenpix.com
KEENPIX_SUPER_ADMIN_EMAIL=you@example.com
POLAR_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_SANDBOX_WEBHOOK_SECRET=whsec_...
POLAR_SERVER=production
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ZONE_ID=...
VITE_GA_MEASUREMENT_ID=G-C04VQED7GV
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

`KEENPIX_APP_URL` supplies the service URL, Better Auth URL, generated-link URL,
and browser build URL so they cannot drift across origins.
The production Compose file fixes `KEENPIX_DEPLOYMENT_ENV=production` so the
deployment mode cannot drift in Coolify. The application rejects localhost or
non-HTTPS URLs and rejects Polar sandbox credentials in production cloud mode.

`VITE_GA_MEASUREMENT_ID` and `VITE_GTM_CONTAINER_ID` are public configuration,
not credentials. Mark configured values as available at both build time and
runtime: Vite embeds them in the browser bundle, while the runtime values keep
the deployment configuration explicit. GTM takes precedence when both are
present. Set the GTM ID only after its published Google tag and custom-event
tags pass Preview and are not scanner-paused; otherwise omit it and use the
direct GA4 fallback. Leaving both unset disables Google product analytics.
Cloudflare Web Analytics supplies independent, cookie-free field performance
monitoring for the public site.

For the production Google Web OAuth client, configure the authorized JavaScript
origin `https://keenpix.com` and redirect URI
`https://keenpix.com/api/auth/callback/google`. Keep the client secret server-only.

`POLAR_TOKEN` and `POLAR_WEBHOOK_SECRET` should come from the Polar environment
matching the public domain. Production deploys must use
`POLAR_SERVER=production` (the app refuses sandbox on `keenpix.com`). The
app boots with generated Coolify values for Postgres, Better Auth, ClickHouse,
Maxio, the super-admin password, and the cron secret.

**Email — production must override the Mailpit default.** Without this,
verification, invite, usage-alert, and dunning emails go to the Mailpit sink
and no customer ever sees them:

```dotenv
EMAIL_PROVIDER=postmark
POSTMARK_API_KEY=...
POSTMARK_FROM=no-reply@keenpix.com   # domain must be verified in Postmark
```

(Resend works too: `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`/`RESEND_FROM`.)
Staging can keep the default `EMAIL_PROVIDER=smtp` → Mailpit.

Cloudflare edge analytics is required in cloud mode because project-attributed
delivery is part of the Polar meter. Use a zone-scoped token with **Zone →
Analytics → Read** plus a separate account token with **Account → Account
Analytics → Read**:

```dotenv
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_HOST=keenpix.com
```

Managed custom delivery domains use a separate write-capable Cloudflare for
SaaS token. Configure the zone's proxied, originless
`fallback.keenpix.com` record and a proxied `customers.keenpix.com` CNAME that
points to it, then set the application variables together:

```dotenv
CLOUDFLARE_SAAS_API_TOKEN=...
CLOUDFLARE_SAAS_ZONE_ID=...
CLOUDFLARE_SAAS_CNAME_TARGET=customers.keenpix.com
CLOUDFLARE_SAAS_EDGE_SECRET=<same random 32+ byte value as the Worker's EDGE_SECRET>
```

The application provisioning token needs only **Zone → SSL and Certificates →
Edit**. The separate Worker deployment identity needs **Account → Workers
Scripts → Edit** and **Zone → Workers Routes → Edit**. Manage the complete
zone route table through the Cloudflare dashboard or API as its single source
of truth; Wrangler deliberately does not declare routes. Assign `*/*` to
`keenpix-delivery-edge`, add more-specific no-Worker routes for Keenpix's app
and origin hostnames, and verify the production route table after every Worker
deployment. Keep the analytics token read-only and separate. Customers create a
DNS-only CNAME to `customers.keenpix.com`, the target shown in Settings → Custom
domains; Cloudflare provisions TLS and the wildcard route handles every verified
custom hostname.

When migrating from `keenpix-custom-domain-edge`, first deploy the new script
without assigning it any routes:

```bash
pnpm --filter @keenpix/delivery-edge deploy
pnpm --filter @keenpix/delivery-edge exec wrangler secret put EDGE_SECRET --name keenpix-delivery-edge
```

Enter the same value as `CLOUDFLARE_SAAS_EDGE_SECRET`, then confirm
`wrangler secret list --name keenpix-delivery-edge` includes `EDGE_SECRET`.
Only then enumerate the zone's Worker routes. Reassign `*/*` and every legacy
exact route owned by
`keenpix-custom-domain-edge` to `keenpix-delivery-edge`, or delete an exact
route when an existing no-Worker exclusion should win. Confirm the complete
route table, then verify that first-party delivery and a customer hostname both
reach `keenpix-delivery-edge`. Retain the old script until those checks pass; it
can then be removed without changing customer DNS or Custom Hostname records.
Remove the obsolete `CLOUDFLARE_SAAS_WORKER_SCRIPT` application variable and
drop **Workers Routes → Edit** from the application provisioning token; neither
is used at runtime.

For callback verification without a webhook subdomain, point Polar sandbox at
`https://keenpix.com/api/auth/polar/sandbox-webhooks` and set that endpoint's
distinct secret as `POLAR_SANDBOX_WEBHOOK_SECRET`. The route verifies the
standard webhook signature and acknowledges the event, but cannot write
subscriptions or entitlements. Production uses
`https://keenpix.com/api/auth/polar/webhooks` with production credentials. A
true sandbox checkout-to-entitlement rehearsal still requires an isolated app
and database; do not run it against the production Keenpix database.

Coolify preview containers may not retain Compose service aliases. When that
occurs, set preview-only `KEENPIX_POSTGRES_HOST` and
`KEENPIX_CLICKHOUSE_HOST` to the corresponding `-pr-<id>` container names;
override the existing `KEENPIX_CACHE_S3_ENDPOINT` and `SMTP_HOST` variables
with the preview Maxio and Mailpit container names. Production leaves these
unset and keeps the Compose service defaults.

Optional resource caps:

```dotenv
KEENPIX_MEM_LIMIT=1G
KEENPIX_PG_MEM_LIMIT=512M
KEENPIX_CPU_LIMIT=1
KEENPIX_PG_CPU_LIMIT=0.5
```

## Backups and restore

The `pg-backup` service writes a compressed `pg_dump` (`-Fc`) into the
`keenpix_branch_pg_backups` volume every 24 hours and prunes dumps older than
`KEENPIX_BACKUP_KEEP_DAYS` (default 14). Postgres is the money-critical store —
users, orgs, subscriptions, and billing watermarks live there. The ClickHouse
volume (analytics events) and cache volumes are rebuildable and are not backed
up.

**This protects against container/data-volume corruption, not disk or VM
loss.** For offsite coverage, back the `keenpix_branch_pg_backups` volume up at
the host level (Hetzner snapshots, restic/borg on the volume path, or a
scheduled `rclone` sync to R2).

Restore drill (run it once so it isn't theory):

```bash
# list available dumps
docker compose -f docker-compose.production.yml exec pg-backup ls -la /backups

# restore INTO THE RUNNING DATABASE (destructive: --clean drops objects first)
docker compose -f docker-compose.production.yml exec pg-backup \
  pg_restore --clean --if-exists -d "$PGDATABASE" /backups/keenpix-<ts>.dump

# then restart the app so caches/entitlements reload
```

For a full rebuild: create fresh volumes, start only `postgres`, copy a dump in
(`docker cp`), `pg_restore`, then start the rest of the stack.

## After deploy

- App health: open the generated app URL and `/api/health`.
- Transform: verify `/health/live` and `/health/ready` inside the transform
  container on port `3002`. These operator probes are not routed through the
  public app or delivery hostname, where `404` is expected.
- Worker: verify `/health/live`, `/health/ready`, and `/health/details` inside
  the worker container. If operators need Workbench, assign the worker service
  an access-controlled domain on port `3001` and sign in with Coolify's generated
  `SERVICE_USER_WORKBENCH` / `SERVICE_PASSWORD_64_WORKBENCH` credentials. Custom
  `KEENPIX_WORKBENCH_USERNAME` / `KEENPIX_WORKBENCH_PASSWORD` values override the
  generated pair when both are supplied. Do not expose the worker port without
  authentication.
- Email: staging — open the Mailpit URL; production — send a signup and confirm
  it arrives at a real inbox via Postmark.
- Billing: configure the Polar webhook endpoint to
  `<app-url>/api/auth/polar/webhooks` (subscribe it to `subscription.created`,
  `active`, `updated`, `canceled`, `uncanceled`, AND `revoked` — `created`
  carries the trial state and `uncanceled` clears a scheduled cancellation).
- Catalog: expose only the standard Basic, Pro, and Business monthly plans
  ($9/$29/$69) publicly. Keep any historical founding products unlisted. Keep
  the +5 custom-domain pack private; the app creates its checkout only for an
  active paid Business organization. Archive older annual products rather than
  deleting them so historical subscriptions remain auditable; annual checkout
  is intentionally not linked by the app.
- Usage cron: confirm `/api/internal/billing/report-usage` runs hourly in the
  `usage-cron` logs. It runs once immediately after app health succeeds, captures
  Cloudflare edge history, sweeps usage alerts, and prunes log retention at
  03:00 UTC. A configured edge response reports `edgeHistory.configured: true`.
- Backups: confirm a `keenpix-*.dump` appears in the `pg-backup` service logs
  within the first day, and run the restore drill above once.
