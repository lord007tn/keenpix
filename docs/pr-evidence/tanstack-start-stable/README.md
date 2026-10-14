# TanStack Start stable migration verification

Verified locally on October 14, 2026, from `master` at `4ff98d6bcfffdb7224b050bc1b5472d493a4c132`. The screenshots and recordings use production builds, a disposable PostgreSQL 18 database, an isolated Redis instance, and a fictional local administrator. They contain no customer records or live provider/account data.

## Package and application coverage

| Application | Start | Router | Vite | React Vite plugin | Nitro |
| --- | --- | --- | --- | --- | --- |
| `apps/app` | `1.169.1` | `1.170.44` | `8.2.1` | `6.0.5` | `3.0.260903-beta` |
| `apps/docs` | `1.169.1` | `1.170.44` | `8.2.1` | `6.0.5` | `3.0.260903-beta` |

The dashboard's existing Vite 8 release is preserved. Docs moves from Vite 7 and React plugin 5 to the same Vite 8/plugin 6 set. The independent delivery-edge application retains Vite `8.3.1`. The framework helper package does not implement a Start application; its existing optional Start peer range remains compatible. Other direct dependency versions are preserved.

Start's registry metadata requires Router `1.170.44`, Vite 8, and Node `>=22.12.0`; TanStack packages have independent version numbers. The repository's existing Node `>=22.18.0` requirement and Node 22 CI/image definitions meet that floor. Local checks used Node `24.21.0` and pnpm `10.30.3`; production HTTP/browser verification used a checksum-verified official Node `22.23.3` executable.

Both Vite configurations use native `resolve.tsconfigPaths`. Start precedes Nitro in the plugin list. The app's Nitro externals use `rolldownConfig`, retaining the BullMQ, Undici, and SVGO exclusions. Both apps emit the `node-server` preset with `.output/server/index.mjs`, matching their existing start scripts and image copy paths. Docker images were not built.

## API and behavior audit

- All 40 server-function `.inputValidator()` calls use `.validator()` with the existing schemas.
- No Start `useSession`, obsolete Start umbrella imports, or `@tanstack/nitro-v2-vite-plugin` were present. Better Auth's library, session configuration, and cookie integration are preserved.
- The custom document entry already uses `createServerEntry` and delegates to the built-in handler. Regression tests cover endpoint-specific returned/thrown Responses, falsy failures, generic error messages, error statuses, multiple cookies, redirect headers, and bodyless responses during Markdown discovery.
- The older Nitro/H3 adapter threw before Start could reject malformed percent encoding. The pinned adapter update resolves H3 to `2.0.1-rc.32`; three regressions and production HTTP checks verify `400` before app routing.
- Router errors are narrowed from `unknown` before reading a string message. Twenty rendering regressions cover development diagnostics and generic production messages. The root metadata check uses the current `_notFound` match flag; an unmatched production URL returns `404` with `noindex,nofollow`.
- App code does not use response-status/header helpers, serialized Location/content helper overrides, singular request-header helpers, or `sendContext` assumptions. Better Auth's integration uses additive `setCookie`. No session-library replacement or forced cookie reset was introduced.

## Checks

- Repository lint passed.
- All workspace typecheck gates passed: 62 Turbo tasks.
- All 788 workspace unit tests passed, including 628 app tests and 38 new regressions.
- All 11 activation/PostgreSQL integration contracts passed against the disposable database.
- Knip passed with two configuration hints. React Doctor's error gate passed with 394 warnings.
- All workspace production builds passed: 46 Turbo tasks, including the app, docs, worker, transform, and delivery edge.
- The final frozen offline installation passed without changing the lockfile. Its SHA-256 is `cb63cdc31f88dda1354419003c5d5e9071cb91940bc0645f9e696fc2a9f7a280`.
- All nine manual-image workflow contracts passed. PR workflows continue to verify source without automatically building images.

The health gates were run sequentially with Turbo concurrency 1 and test workers limited to 2 to share the development computer. CI runs the repository's standard `pnpm health` gate.

## Production runtime and browser results

- App and docs health endpoints returned `200` on Node 22. Both remained available after malformed URLs returned `400`.
- Signed-out dashboard requests redirected to login. Better Auth rejected an incorrect password, accepted the fictional fixture account, reused its cookie, and rejected the prior session after sign-out.
- Protected project/dashboard server functions accepted authenticated reads and rejected signed-out calls. Dashboard GET validation and project-creation POST validation rejected invalid input. No project was created.
- SDK authentication retained its explicit `401` JSON payload; the disabled billing callback retained its explicit `404` text payload.
- Docs loaders returned valid documents and rejected invalid inputs/missing documents. Function errors are checked as decoded error envelopes; their RPC transport status can be `200`. Missing documents render `404` as HTML. Requests without same-origin RPC metadata returned `403`.
- Chrome completed sign-in and client navigation using the production builds. App login/dashboard and docs pages were inspected at 1440 × 900 and 390 × 844. The inspected mobile pages had no document overflow. No app browser console errors or warnings were recorded.

| View | Desktop | Mobile |
| --- | --- | --- |
| Signed-out app | [Login](app-login-desktop.png) | [Login](app-login-mobile.png) |
| Synthetic signed-in app | [Dashboard](app-dashboard-desktop.png) | [Dashboard](app-dashboard-mobile.png) |
| Documentation | [Documentation](docs-desktop.png) | [Quickstart](docs-mobile.png) |

[Sign-in recording](app-sign-in.webm) · [Docs client-navigation recording](docs-navigation.webm)

## Scope and limits

Verification covers local production builds and synthetic self-host authentication. Live cloud/provider accounts, external sign-in providers, billing, deployments, and existing customer sessions were not exercised. These applications currently render English/LTR; no RTL application mode was present. The standalone docs app's pre-existing missing `favicon.ico` returned `404` during the first browser visit. Existing dependency peer warnings and Doctor warnings remain outside the migration.

Only reviewed screenshots, short recordings, and this sanitized summary are retained here. Environment files, generated credentials, session/cookie exports, raw runtime logs, and database contents are excluded. No production keys were changed, and no merge or deployment was performed.

## Sources

- [Official release-candidate migration guide](https://raw.githubusercontent.com/TanStack/router/main/docs/start/framework/react/migrate-from-release-candidate.md)
- [Start 1.169.1 registry metadata](https://registry.npmjs.org/@tanstack/react-start/1.169.1)
- [Vite migration guide](https://vite.dev/guide/migration) and [native TypeScript path resolution](https://vite.dev/config/shared-options#resolve-tsconfigpaths)
- [Start Nitro hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro)
- [Nitro configuration](https://nitro.build/config) and [H3 malformed URL rejection](https://github.com/h3js/h3/blob/v2.0.1-rc.31/src/h3.ts)
