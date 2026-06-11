# Keenpix

![Keenpix brand image](./public/brand/keenpix-og.png)

Keenpix is a self-hosted image optimization layer for teams that want the speed of an image CDN without handing the pipeline to another service. Point it at an allowlisted origin, request one URL, and Keenpix fetches the image, transforms it with [sharp](https://sharp.pixelplumbing.com/), caches the variant to disk, records analytics, and serves a CDN-ready response.

It is built for operators who want the important parts kept visible: project allowlists, request logs, disk cache behavior, and deployment configuration all live in your own stack.

## What Keenpix ships

- **Transform API** - `GET /img/https://origin.example/photo.jpg?project=...&w=...&fmt=...` resizes, crops, filters, re-encodes, negotiates modern formats, and returns immutable cache headers.
- **No public API keys** - access is gated by each project's domain allowlist. An empty allowlist fails closed with 403, so a fresh project is never an open proxy.
- **Internal API keys** - trusted backend systems can manage projects, domains, and pipeline settings through authenticated JSON endpoints.
- **Projects and origins** - each project owns its source host rules, settings, request logs, and analytics.
- **Built-in analytics** - requests, bandwidth saved, cache hit rate, output formats, latency, and top images come from the request log.
- **Self-host dashboard** - seeded super admin, staff invitations, project settings, SMTP configuration, and operational views.
- **Open-internet hardening** - allowlist checks, private/loopback/link-local/CGNAT blocking, IPv4-mapped IPv6 handling, DNS rebinding protection, response-size limits, decompression-bomb limits, and transform back-pressure.

Stack: TanStack Start (React 19, SSR) · Prisma 7 + PostgreSQL · sharp · Docker. Apache-2.0 licensed.

---

## Code style

Keenpix keeps helpers and utils scoped by folder and purpose:

- `helpers/<domain>/` is for pure domain helpers with real parsing, composition, or validation behavior. Do not put broad catch-all files like `helpers/admin.ts` here.
- `utils/<primitive>/` is for pure generic primitives, not product-specific response shaping.
- Do not extract functions that only return object literals or forward fields. Keep that code in the owning module unless the helper removes real logic or validation edge cases.
- Use operation verbs precisely: `getProject` for one identified project, `listProjects` for a collection, and explicit mutation/check verbs such as `create`, `update`, `delete`, `verify`, `enable`, `disable`, `add`, and `remove`.
- `data-access/` talks to the database; `actions/` combine data-access/helpers/utils/integrations into use cases; `functions/` validate, authorize, shape entry/exit data, and call actions.
- Function complexity lint rules are disabled on purpose. Prefer readable local control flow over splitting code only for a metric.

See [AGENTS.md](./AGENTS.md) and [src/README.md](./src/README.md) for the full repository rules.

---

## Quick start (Docker — the self-host path)

Requires Docker + Docker Compose.

```bash
cp .env.example .env
# Generate a signing secret and put it in .env (compose refuses to start without one):
#   openssl rand -hex 32   →   BETTER_AUTH_SECRET=...
# Set POSTGRES_PASSWORD, KEENPIX_SUPER_ADMIN_EMAIL, and KEENPIX_SUPER_ADMIN_PASSWORD in .env.
docker compose up -d
```

The app comes up on **http://localhost:3000** by default. Set `KEENPIX_PORT` to publish a different host port, `BETTER_AUTH_URL` to your public base URL, or `KEENPIX_IMAGE` to a pinned image tag/digest. Compose runs Postgres, applies migrations on boot, seeds the default org and super admin user, and exposes `/api/health` for the container healthcheck. Docker/self-host mode sets `KEENPIX_SELF_HOST=true`, so `/` shows a private self-host splash with links into `/app` and `/docs`; the dashboard, API, and docs are served, while public marketing and LLM export routes are not.

The Docker image entrypoint accepts `start` (default), `migrate`, and `seed`. For normal installs, leave the default `start`; it applies migrations, seeds bootstrap data, then starts the app. Set `KEENPIX_RUN_MIGRATIONS=false` or `KEENPIX_RUN_SEED=false` only when an external deployment workflow owns those steps.

## Quick start (Coolify)

Use [docker-compose.coolify.yml](./docker-compose.coolify.yml) for a Coolify service stack.

1. In Coolify, create a new resource with **Docker Compose Empty**.
2. Paste the contents of `docker-compose.coolify.yml`.
3. Set your public domain on the `app` service. Coolify will generate `SERVICE_URL_APP`, database credentials, the auth secret, and the super-admin password. `BETTER_AUTH_URL` and `KEENPIX_APP_URL` are inferred from `SERVICE_URL_APP`, which must match the browser-facing URL without the container port.
4. Optionally change `KEENPIX_SUPER_ADMIN_EMAIL` from the default `admin@example.com`.
5. Deploy, then sign in with `KEENPIX_SUPER_ADMIN_EMAIL` and the generated `SERVICE_PASSWORD_64_ADMIN` value shown in Coolify's environment variables.

The Coolify stack uses the pinned `ghcr.io/lord007tn/keenpix:v0.1.2` image, keeps Postgres private, persists database/cache volumes, runs migrations and seed on app startup, and exposes the app through Coolify's proxy on container port `3000`.

If an earlier Coolify deploy failed with a Postgres 18 message about existing data in `/var/lib/postgresql/data`, remove the failed `keenpix-pg` volume from that Coolify resource or recreate the resource before deploying this compose. The Coolify compose now uses a fresh `keenpix_pg18` volume mounted at `/var/lib/postgresql`, which is the Postgres 18-compatible layout.

**First run (empty database):**
1. Open http://localhost:3000 and sign in with `KEENPIX_SUPER_ADMIN_EMAIL` and `KEENPIX_SUPER_ADMIN_PASSWORD`.
2. Create a **project** (its origin hostname is added to the allowlist automatically).
3. In **Settings**, invite staff by copying an invitation link, and optionally configure SMTP to send invitation/test emails.
4. Add any other image hosts under **Allowed hosts**, and copy the **Project ID** (shown at the top of Settings).
5. Request an image — **no API key**, just make sure the source host is allowlisted:
   ```bash
   curl -o out.webp \
     "http://localhost:3000/img/https://your-cdn.example.com/photo.jpg?project=<PROJECT_ID>&w=600&fmt=webp"
   ```

---

## Quick start (local dev)

Requires Node 22+, pnpm, and a PostgreSQL database.

```bash
pnpm install
cp .env.example .env          # point DATABASE_URL at your Postgres
                              # and set KEENPIX_SUPER_ADMIN_EMAIL / KEENPIX_SUPER_ADMIN_PASSWORD
pnpm db:migrate               # apply schema
pnpm db:seed                  # seed default org + admin user
pnpm dev                      # http://localhost:3000
```

---

## Configuration

All via environment variables (see `.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. |
| `POSTGRES_PASSWORD` | ✅ (compose) | Password for the bundled Compose Postgres service. Compose refuses to start without it. |
| `BETTER_AUTH_SECRET` | ✅ (prod) | Session signing secret — `openssl rand -hex 32`. The app refuses to boot in production with a missing or known-weak/placeholder value. |
| `BETTER_AUTH_URL` | – | Public base URL (default `http://localhost:3000`). HTTPS enables secure cookies automatically. |
| `KEENPIX_APP_URL` | – | Canonical URL used for hosted docs metadata and generated OG/LLM links. Defaults to `BETTER_AUTH_URL`. |
| `KEENPIX_SUPER_ADMIN_EMAIL` | ✅ | Email for the seeded super admin account. |
| `KEENPIX_SUPER_ADMIN_PASSWORD` | ✅ | Password for the seeded super admin account. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | – | Optional SMTP fallback used only when Settings SMTP is disabled or incomplete. |
| `SMTP_USER` / `SMTP_PASSWORD` | – | Optional fallback SMTP credentials. |
| `SMTP_FROM_EMAIL` / `SMTP_FROM_NAME` | – | Optional fallback SMTP sender defaults. |
| `KEENPIX_SELF_HOST` | – | Set `true` to run app-only self-host mode. Docker images default this to `true`. |
| `KEENPIX_RUN_MIGRATIONS` / `KEENPIX_RUN_SEED` | – | Docker entrypoint controls for running migrations and bootstrap seed before app start. Defaults to `true`. |
| `KEENPIX_CACHE_DIR` | – | Disk cache location (default `./.keenpix-cache`). |
| `KEENPIX_CACHE_MAX_BYTES` | – | LRU eviction cap (default 2 GB). |
| `KEENPIX_MEMORY_CACHE_MAX_BYTES` | – | In-process hot variant LRU cap; set `0` to disable (default 64 MB). |
| `KEENPIX_MAX_ORIGIN_BYTES` | – | Reject origin responses larger than this (default 50 MB). |
| `KEENPIX_MAX_INPUT_PIXELS` | – | Decompression-bomb ceiling (default ~50 MP). |
| `KEENPIX_MAX_DIMENSION` | – | Longest output side when a request omits `w`/`h` (default 4096). |
| `KEENPIX_ORIGIN_TIMEOUT_MS` | – | Per-attempt origin fetch timeout; a slow origin returns 504 (default 10000). |
| `KEENPIX_MAX_CONCURRENCY` / `KEENPIX_MAX_QUEUE` | – | Concurrent transform jobs / queue depth before shedding 503. |

---

## Transform API

```
GET /img/<origin-url>?project=<id>&w=&h=&q=&fmt=&fit=&dpr=&blur=&...
```

**No authentication header.** Access is controlled by the project's allowlist — the request only succeeds if the source URL's host is listed under that project's **Allowed hosts**.

| Param | Meaning |
|---|---|
| `project` | Project id (copy it from **Settings → Project ID**). Its allowlist is the gate. |
| path source | Source image URL after `/img/` — its host must be on the project allowlist. |
| `w` / `h`, `resize` / `s` | Target width/height (1–5000). `resize`/`s` accept `WIDTHxHEIGHT`, `WIDTH`, or `xHEIGHT`. |
| `q` | Quality 30–100 (default 75). |
| `fmt` | `auto` (Accept-negotiated), `avif`, `webp`, `jpeg`, `png`, `gif`, `heif`, `tiff`. |
| `fit` | `cover` / `contain` / `fill` / `inside` / `outside`. |
| `position` / `pos` / `gravity` | Crop anchor for `cover`/`contain`: edges, corners, compass gravity, `entropy`, or `attention`. |
| `dpr` | Device pixel ratio 1–3. |
| `enlarge` | Allows upscaling when set to `1`/`true`; omitted requests do not upscale. |
| `kernel` | Resize kernel: `nearest`, `linear`, `cubic`, `mitchell`, `lanczos2`, `lanczos3`, `mks2013`, `mks2021`. |
| `background` / `bg`, `flatten` | Fill color and alpha flattening controls. |
| `extract` / `crop`, `trim`, `extend`, `extendWith` | Exact crop rectangle, edge trim, and output padding controls. |
| `rotate` / `r`, `flip`, `flop` | Arbitrary rotation and vertical/horizontal mirroring. |
| `blur`, `sharpen`, `median`, `gamma`, `negate`, `normalize`, `threshold` | Pixel filters and corrections. |
| `brightness`, `saturation`, `hue`, `lightness`, `tint`, `grayscale` / `greyscale` | Color adjustment controls. |
| `animated` / `a` | Preserve animated GIF/WebP frames when output supports them. |

Simple source URLs can be written directly in the path. If the source URL contains its own `?` or `#`, URL-encode the source before appending Keenpix transform parameters.

Responses set `Cache-Control: public, max-age=31536000, immutable` and `Vary: Accept`, so a CDN can cache each image variant once you configure it to cache `/img/*` with the full query string. The source URL lives in the path so Cloudflare and other CDNs can still see the source file extension; use omitted `fmt` / `fmt=auto` only when your CDN can cache separate `Accept` variants, and use explicit `fmt` values when you intentionally want a fixed output format.

Framework image components usually map their `format` prop directly to `fmt`. Leave that prop unset for browser-based AVIF/WebP negotiation; `format="avif"` or `format="webp"` forces that format.

### IPX modifier comparison

Keenpix is remote-origin and project-allowlist oriented rather than a storage-provider router, but its Sharp modifier surface now covers the practical IPX-style image operations.

| IPX-style capability | Keenpix support | Notes |
|---|---|---|
| `w`, `h`, `q`, `fmt`, `fit`, `dpr`, `blur` | Supported | Original focused surface. |
| `position` / `pos` / `gravity` | Supported | Includes edges, corners, compass gravity, `entropy`, and `attention`. |
| `background` | Supported | Used by `contain`, `flatten`, `extend`, and arbitrary rotate. |
| `flatten` | Supported | Merges alpha onto the configured background. |
| `fit=outside` | Supported | Sharp `outside` fit mode. |
| `resize` / `s=WxH` | Supported | Compact aliases; explicit `w`/`h` take priority. |
| `enlarge` | Supported, opt-in | Default remains no-upscale. |
| `kernel` | Supported | Sharp resize kernels. |
| `extract` / `crop` | Supported | `left,top,width,height`. |
| `trim` | Supported | Boolean or threshold. |
| `extend` | Supported | CSS-like one, two, or four-value padding. |
| arbitrary `rotate` | Supported | EXIF auto-orient still runs first. |
| `flip` / `flop` | Supported | Vertical / horizontal mirror. |
| `sharpen`, `median`, `gamma` | Supported | Conservative numeric ranges. |
| `negate`, `normalize`, `threshold` | Supported | Boolean and threshold controls. |
| `modulate`, `tint`, `grayscale` | Supported | Brightness/saturation/hue/lightness, tint, grayscale. |
| `animated` / `a` | Supported | Enables Sharp animated decoding. |
| Extra formats | Supported | Adds `gif`, `heif`, and `tiff` alongside `avif`, `webp`, `jpeg`, `png`. |
| SVGO/SVG optimization | Not a Keenpix transform mode | SVG inputs can still rasterize through Sharp; SVG pass-through/SVGO is a separate delivery decision. |
| Local/storage providers | Product-scope difference | Keenpix intentionally uses remote origins gated by project allowlists instead of filesystem/Unstorage providers. |

**Failure modes:**

| Status | When |
|---|---|
| **400** | Missing source URL or `?project`, or a malformed/non-http(s) URL |
| **403** | Source host not on the project allowlist (or the allowlist is empty), or it resolves to a private/loopback/link-local/CGNAT/multicast address (incl. IPv4-mapped IPv6 and DNS-rebinding) |
| **404** | Unknown `project` id |
| **413** | Origin image exceeds `KEENPIX_MAX_ORIGIN_BYTES` |
| **502** | Origin unreachable, errored, returned a non-image body, or too many redirects |
| **503** | Transform queue saturated (back-pressure) |
| **504** | Origin timed out |

In an `<img>`, any non-200 shows as a broken image — a 403 almost always means the source host isn't on the allowlist.

---

## SDK API

SDK API keys are for trusted backend integrations such as JoodCMS. They are separate from the public image transform flow: `/img/*` still uses project allowlists and does not require an authentication header.

Create a key from **Workspace → API Keys** as a super admin. Keys can be scoped to every project or to a single project. Project scope is stored on the Better Auth API key metadata, so no custom token table is used. Project-scoped keys can only read or write that project and cannot create new projects. The key is shown once. Send it as either:

```bash
Authorization: Bearer <KEY>
# or
X-Keenpix-Api-Key: <KEY>
```

All SDK endpoints live under `/api/sdk`, return JSON, and use `Cache-Control: no-store`. The self-host build currently uses the default org (`org_default`) for SDK project operations.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/sdk/projects` | List projects visible to the key. All-project keys see all default-org projects; project-scoped keys receive only their project. |
| `POST` | `/api/sdk/projects` | Create a project. All-project write key required. Body: `name`, `origin`, `env`, optional `allowedOrigins`. |
| `GET` | `/api/sdk/projects/<projectId>` | Fetch one project. |
| `GET` | `/api/sdk/projects/<projectId>/configuration` | Fetch integration-safe image configuration for clients such as JoodCMS. |
| `PATCH` | `/api/sdk/projects/<projectId>/settings` | Update transform defaults. Body may include `autoFormat`, `stripMetadata`, and/or `defaultQuality`. |
| `POST` | `/api/sdk/projects/<projectId>/domains` | Add an allowed source host. Body: `{ "host": "cdn.example.com" }`. Use a hostname, not a URL. |
| `DELETE` | `/api/sdk/projects/<projectId>/domains?host=<host>` | Remove an allowed source host. A JSON body `{ "host": "cdn.example.com" }` is also accepted. |

Create a project:

```bash
curl -X POST "https://keenpix.example.com/api/sdk/projects" \
  -H "Authorization: Bearer $KEENPIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Storefront",
    "origin": "https://cdn.example.com",
    "env": "production",
    "allowedOrigins": ["cdn.example.com"]
  }'
```

Read the project configuration that JoodCMS stores and displays:

```bash
curl "https://keenpix.example.com/api/sdk/projects/$PROJECT_ID/configuration" \
  -H "Authorization: Bearer $KEENPIX_API_KEY"
```

Response shape:

```json
{
  "configuration": {
    "projectId": "cm...",
    "projectName": "Storefront",
    "origin": "https://cdn.example.com",
    "allowedOrigins": ["cdn.example.com"],
    "imageBaseUrl": "https://keenpix.example.com/img",
    "transformUrlTemplate": "https://keenpix.example.com/img/<source-url>?project=cm...",
    "defaults": {
      "autoFormat": true,
      "defaultQuality": 75,
      "stripMetadata": true
    },
    "supportedParameters": [
      "project", "url", "w", "h", "q", "fmt", "fit", "dpr", "blur",
      "position", "pos", "gravity", "background", "flatten", "resize", "s",
      "enlarge", "kernel", "extract", "crop", "trim", "extend", "rotate",
      "flip", "flop", "sharpen", "median", "gamma", "negate", "normalize",
      "threshold", "brightness", "saturation", "hue", "lightness", "tint",
      "grayscale", "animated"
    ]
  }
}
```

`imageBaseUrl` and `transformUrlTemplate` are derived from `X-Forwarded-Host` and `X-Forwarded-Proto` when a proxy sends them, then fall back to the request origin. In proxied deployments, configure the reverse proxy to forward the public host and protocol so integrations see the external Keenpix URL.

Manage domains and settings:

```bash
curl -X POST "https://keenpix.example.com/api/sdk/projects/$PROJECT_ID/domains" \
  -H "Authorization: Bearer $KEENPIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "host": "assets.customer.com" }'

curl -X PATCH "https://keenpix.example.com/api/sdk/projects/$PROJECT_ID/settings" \
  -H "Authorization: Bearer $KEENPIX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "autoFormat": true, "defaultQuality": 82, "stripMetadata": true }'
```

Failure modes:

| Status | When |
|---|---|
| **400** | Invalid JSON, invalid URL/host, or invalid settings. |
| **401** | Missing or invalid API key. |
| **403** | API key is project-scoped and cannot access the requested project or operation. |
| **404** | Unknown project or endpoint. |
| **429** | API key rate limit exceeded. |

---

## Scripts

| Command | Does |
|---|---|
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` / `pnpm preview` | Production build / preview |
| `pnpm test` | Unit tests (vitest) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm fix` | Biome check / auto-fix |
| `pnpm knip` / `pnpm doctor` | Dead-code and React health scans |
| `pnpm health` | Full local quality gate: lint, typecheck, tests, knip, doctor, build |
| `pnpm db:migrate` / `db:seed` | Prisma migrate / seed |

---

## Releases and Docker Images

Keenpix releases from a semantic version tag (`vMAJOR.MINOR.PATCH`, e.g. `v0.1.0`). Before tagging, add a matching `## [vX.Y.Z] - YYYY-MM-DD` section to [CHANGELOG.md](./CHANGELOG.md) and bump `version` in `package.json`. Pushing the tag then creates the GitHub release from that changelog section ([release.yml](./.github/workflows/release.yml)) and publishes the GHCR image as `vX.Y.Z` and `vX.Y` ([docker.yml](./.github/workflows/docker.yml)); pushes to `master` publish `latest`.

```bash
git tag v0.1.0
git push origin v0.1.0
```

See [RELEASE.md](./RELEASE.md) for the full maintainer checklist. The compose file defaults to `ghcr.io/lord007tn/keenpix:latest`; override with `KEENPIX_IMAGE` to pin a tag or digest.

---

## Hosted Docs

Hosted builds serve the marketing page, Fumadocs documentation, docs search, `llms.txt`, `llms-full.txt`, and generated docs OG images. Self-hosted builds serve the dashboard, API, and documentation, but skip the marketing landing page and LLM export routes.

---

## Architecture

Four one-way layers: **route → server fn (`*Fn`) → action (pure) → data-access (Prisma)**. The transform endpoint (`/img/*`) is a route handler calling the pure sharp/SSRF/cache actions directly. Every record is `orgId`-scoped (self-host runs as a single org; SaaS-ready later).

```
src/
  routes/        UI + API route handlers (/img/*, /api/health, /api/auth)
  functions/     server fns (auth-gated via middleware)
  actions/       pure logic — transform pipeline, SSRF guard
  data-access/   Prisma queries
  lib/           sharp, cache, auth
```

---

## License

[Apache License 2.0](./LICENSE).
