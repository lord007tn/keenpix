# Source Structure

Domain-first structure for the Keenpix app and transform API.
One-way dependency flow:

```
routes/  →  functions/  →  actions/  →  data-access/  →  db
(thin UI)   (entry/exit)   (use cases)    (Prisma)
                         ↘ helpers / utils / integrations / lib
```

- `routes/` — TanStack Router file-based routes. UI routes call `functions/`; API route adapters stay thin and may call `actions/` directly when they own HTTP request/response handling.
- `functions/` — Public server boundary for API routes, React Query, and UI calls. Own validation, auth/permission checks, entry/exit shaping, and call `actions/`. `createServerFn` exports end with `Fn`; HTTP adapters use explicit request-handler names such as `handleTransformRequest`.
- `actions/` — Use-case orchestration called by `functions/` and API adapters. Actions can combine `data-access`, `helpers`, `utils`, `integrations`, and `lib`, but should not build UI. Fat actions are fine when the workflow is real.
- `data-access/` — Direct DB operations and DB health probes only. Deterministic functions named by intent: `getX` gets one by identifier, `listX` gets a collection, and mutations/checks use verbs such as `createX`, `updateX`, `deleteX`, `verifyX`, `enableX`, `disableX`, `addX`, or `removeX`.
- `data-access/helpers/<domain>/` — Pure domain helpers with real parsing/composition/validation behavior. No DB calls, auth checks, routing, rendering, or broad catch-all files such as `helpers/admin.ts`.
- `data-access/utils/<primitive>/` — Pure generic primitives for the data-access layer. No product/domain concepts and no API/UI response shaping.
- `db/` — Prisma client bootstrap.
- `errors/` — Shared error classes and normalization helpers. Domain errors live here, not inside actions/lib modules.
- `lib/` — external integrations and reusable infrastructure: `auth/` (better-auth), `sharp/` (transform wrapper), `transform/` (SSRF/origin/parameter helpers), `cdn/` (cache-control/cache-key/cache storage), `concurrency`, `logger`.
- `components/ui/` — frozen shadcn components (don't hand-edit except to add `cva` variants).
- `components/app/` — shared app components (sidebar, topbar, stat cards, chart wrappers).
- `features/` — domain modules (components/schemas/types) for analytics, projects, logs.
- `shared/` — cross-cutting types, constants, errors, formatters.
- `stores/` — client-side state.
- `styles.css` — global CSS: shadcn OKLCH tokens, semantic status vars, and `@theme inline`.

## Naming rules
- Data-access: `getX`, `listX`, `createX`, `updateX`, `deleteX`.
- `getX` is singular and requires an identifier such as id or slug; `listX` is plural and returns a collection.
- Server functions: `createServerFn` exports end with `Fn` (e.g. `listProjectsFn`); HTTP adapters use `handleXRequest`.
- Actions: plain verbs/use-case names (e.g. `optimizeProjectImage`).
- Helpers and utils: use `helpers/<domain>/<specific-behavior>.ts` and `utils/<primitive>/<specific-behavior>.ts`; do not add flat `*-helpers.ts`, `*-utils.ts`, or catch-all helper files.
- Do not create helpers that only return object literals or forward fields. Keep those transformations local unless there is real logic or validation to share.
