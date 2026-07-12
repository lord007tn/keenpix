# Deploying Keenpix branch cloud on Coolify

**This compose file runs the production keenpix.com deployment** (Coolify
application `keenpix-branch-cloud` under the **Raed** project, built from the
`cloud` branch, manual redeploys). It can also be pointed at any branch for a
disposable staging copy. The stack: app, Postgres, ClickHouse, an S3-compatible
cache, Mailpit (staging email sink), the hourly usage cron, and a daily
Postgres backup job.

## Coolify resource

1. Open `https://coolify.joodlab.com/` and log in.
2. Go to the **Raed** project.
3. Create a new resource from the Keenpix Git repository.
4. Build Pack: **Docker Compose**.
5. Branch: `cloud` for production; any branch for staging.
6. Base Directory: `/`.
7. Docker Compose Location: `docker-compose.branch-cloud.yml`.
8. Name the resource `keenpix-branch-cloud`.

Coolify's Docker Compose docs say to route non-80 app ports by assigning the
domain to the service with the container port. This compose file uses
`SERVICE_URL_APP_3000`, so Coolify will generate and route the app URL to port
`3000`. Mailpit uses `SERVICE_URL_MAILPIT_8025` for the email inbox UI.

## Required environment variables

Set these in Coolify before deploying:

```dotenv
KEENPIX_APP_URL=https://keenpix.com
BETTER_AUTH_URL=https://keenpix.com
VITE_KEENPIX_PUBLIC_URL=https://keenpix.com
KEENPIX_SUPER_ADMIN_EMAIL=you@example.com
POLAR_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_SERVER=production
VITE_GTM_CONTAINER_ID=GTM-TFJ9TQDN
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
```

The three public URL variables must resolve to the HTTPS apex domain so Better
Auth callbacks, generated links, and the browser build all agree on one origin.

`VITE_GTM_CONTAINER_ID` is public configuration, not a credential. Mark it as
available at both build time and runtime: Vite embeds it in the browser bundle,
while the runtime value keeps the deployment configuration explicit. A missing
value leaves consent controls and first-party Web Vitals reporting active but
does not load Google Tag Manager.

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

Optional Cloudflare edge analytics (separate from DNS/TLS and R2) requires a
zone-scoped token with **Zone → Analytics → Read**:

```dotenv
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ZONE_ID=...
CLOUDFLARE_HOST=keenpix.com
```

For Polar sandbox verification, deploy a separate cloud staging hostname and
set that resource to `POLAR_SERVER=sandbox` with its sandbox token and webhook
secret. Point the sandbox endpoint at
`https://<staging-host>/api/auth/polar/webhooks`. The application refuses a
sandbox Polar server when its public hostname is `keenpix.com`; production uses
`https://keenpix.com/api/auth/polar/webhooks` with production credentials.

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
docker compose -f docker-compose.branch-cloud.yml exec pg-backup ls -la /backups

# restore INTO THE RUNNING DATABASE (destructive: --clean drops objects first)
docker compose -f docker-compose.branch-cloud.yml exec pg-backup \
  pg_restore --clean --if-exists -d "$PGDATABASE" /backups/keenpix-<ts>.dump

# then restart the app so caches/entitlements reload
```

For a full rebuild: create fresh volumes, start only `postgres`, copy a dump in
(`docker cp`), `pg_restore`, then start the rest of the stack.

## After deploy

- App health: open the generated app URL and `/api/health`.
- Email: staging — open the Mailpit URL; production — send a signup and confirm
  it arrives at a real inbox via Postmark.
- Billing: configure the Polar webhook endpoint to
  `<app-url>/api/auth/polar/webhooks` (subscribe it to `subscription.created`,
  `active`, `updated`, `canceled`, `uncanceled`, AND `revoked` — `created`
  carries the trial state and `uncanceled` clears a scheduled cancellation).
- Usage cron: confirm `/api/internal/billing/report-usage` runs hourly in the
  `usage-cron` logs (it also sweeps usage alerts, and prunes log retention at
  03:00 UTC).
- Backups: confirm a `keenpix-*.dump` appears in the `pg-backup` service logs
  within the first day, and run the restore drill above once.
