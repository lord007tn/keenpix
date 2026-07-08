# Deploying Keenpix branch cloud on Coolify

Use this for a disposable/staging cloud-mode service under the **Raed** Coolify
project. It builds from the selected Git branch and runs the cloud stack with
Postgres, ClickHouse, an S3-compatible cache, Mailpit, and the usage cron.

## Coolify resource

1. Open `https://coolify.joodlab.com/` and log in.
2. Go to the **Raed** project.
3. Create a new resource from the Keenpix Git repository.
4. Build Pack: **Docker Compose**.
5. Branch: the branch you want to test.
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
KEENPIX_SUPER_ADMIN_EMAIL=you@example.com
POLAR_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_SERVER=sandbox
```

`POLAR_TOKEN` and `POLAR_WEBHOOK_SECRET` should come from Polar sandbox for this
testing service. The app will boot with generated Coolify values for Postgres,
Better Auth, ClickHouse, Maxio, the super-admin password, and the cron secret.

Optional resource caps:

```dotenv
KEENPIX_MEM_LIMIT=1G
KEENPIX_PG_MEM_LIMIT=512M
KEENPIX_CPU_LIMIT=1
KEENPIX_PG_CPU_LIMIT=0.5
```

## After deploy

- App health: open the generated app URL and `/api/health`.
- Email testing: open the generated Mailpit URL and watch signup, verification,
  password reset, and invite emails.
- Billing testing: configure the Polar sandbox webhook endpoint to
  `<app-url>/api/auth/polar/webhooks`.
- Usage cron: confirm `/api/internal/billing/report-usage` runs hourly in logs.

This service is intentionally not production. Keep it on sandbox billing, do not
point production customer traffic at it, and reset its volumes when a clean test
database is needed.
