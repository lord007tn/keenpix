# Keenpix — dashboard information-architecture proposal

> Static HTML mockups exploring how to structure the `/app` control plane around
> four distinct "spheres": **all-projects bird's-eye**, **per-project**,
> **product/instance settings**, and **per-project settings**.
>
> Everything in `design/dashboard-ia/` is a throwaway design prototype (plain
> HTML + one shared stylesheet). No product code is touched. Open
> [`index.html`](./index.html) (served, not `file://`) to browse the three
> approaches.

---

## 1. What exists today

The current app uses **one sidebar** plus a **scope toggle**. The
[project switcher](../../src/components/app/project-switcher.tsx) writes
`?project=<id>` into the URL ([project-context](../../src/stores/project-context.tsx)),
and the four sidebar items —
[Dashboard, Analytics, Live logs, Settings](../../src/components/app/app-sidebar.tsx) —
each *re-interpret themselves* depending on whether the scope is **"All projects"**
or **one project**.

Instance-wide concerns live elsewhere:

- **Workspace** (Staff · Email/SMTP · API keys · Operations) is a
  [super-admin-only tab page](../../src/routes/app/workspace/index.tsx) reached
  **only from the avatar dropdown**
  ([nav-user](../../src/components/app/nav-user.tsx)).
- **Account** (profile + appearance) is also in the avatar dropdown.

## 2. The problem

| # | Pain | Where it shows |
|---|------|----------------|
| 1 | **The scope toggle overloads every page.** One nav item means two different things depending on `?project=`. | Dashboard / Analytics / Logs / Settings all branch on `isAll`. |
| 2 | **`Settings` dead-ends in "All projects".** It renders a "Select a project" interstitial instead of a real page. | [settings/index.tsx](../../src/routes/app/settings/index.tsx) `if (isAll) …` |
| 3 | **No first-class bird's-eye.** "All projects" is a *mode* of the dashboard, not a view designed for comparing projects. | dashboard renders the same cards either way |
| 4 | **Product/instance settings are buried.** Operations, API keys, Staff and Email are only reachable from the avatar menu, and only for super-admins. | [nav-user.tsx](../../src/components/app/nav-user.tsx) `isSuperAdmin ? …` |
| 5 | **"Settings" is ambiguous.** Per-project Settings and the instance Workspace tabs use the same word in different places; Account is a third settings-like spot. | three scattered destinations |

## 3. The model — four spheres + Account

Every approach below is built on the same idea: **stop overloading one nav with a
scope toggle, and give each concern a real home.**

| Sphere | Contains | Scope |
|--------|----------|-------|
| **① Fleet** (bird's-eye) | Aggregate KPIs across projects, project comparison table, cross-project activity/alerts | all projects |
| **② Project** | Overview, Analytics, Live logs | one project |
| **③ Instance / Product** | Operations health, API keys, Staff, Email/SMTP, **product/pipeline defaults** | the whole instance |
| **④ Project settings** | Origin, pipeline defaults, host allowlist | one project |
| *Account* | Profile, appearance | personal |

Spheres ① and ③ are the "global product" data and settings the brief asked for;
② and ④ are the per-project data and settings.

## 4. Three approaches

All three cover all four spheres with the same mock data — they differ only in the
**navigation chrome**, which is the real decision.

### Approach A — Drill-down workspace  ·  [`approach-a.html`](./approach-a.html)
*Vercel / Linear style.* The sidebar has two modes. Default is **Fleet** (Overview,
Projects, Analytics, Activity) with an **Instance** group below (Operations, API
keys, Staff, Email, Product settings). Clicking a project **enters project context**:
the sidebar swaps to that project (Overview · Analytics · Logs · Settings) with a
"← All projects" way out.

- **Pros:** cleanest separation — you're never unsure of scope. "Settings" only ever
  means *project* settings (instance config lives under Instance). Scales best when
  there are many projects.
- **Cons:** a mode switch to learn; two clicks to hop between two projects' logs.
- **Best for:** instances that grow to many projects; the strongest long-term IA.

### Approach B — Grouped single sidebar  ·  [`approach-b.html`](./approach-b.html)
*Lowest-risk evolution of today.* One sidebar, three always-visible labelled groups:
**Overview** (Fleet, Projects, Analytics, Activity), **Project** (with an inline
project picker — Dashboard, Analytics, Logs, Settings), **Instance** (Operations, API
keys, Staff, Email, Product settings).

- **Pros:** no hidden modes; everything is one click away; closest to the current
  code, so the cheapest to ship. Directly fixes pains #2–#5 by giving the bird's-eye,
  the project picker, and the instance settings explicit homes.
- **Cons:** denser sidebar; the "current project" is a persistent global rather than
  a place you enter.
- **Best for:** shipping an improvement next sprint with minimal churn.

### Approach C — Command center  ·  [`approach-c.html`](./approach-c.html)
*PostHog / Grafana style.* Horizontal top-tabs (Overview · Projects · Analytics ·
Logs · Operations · Settings) with a **global project filter** in the top bar.
Bird's-eye is the landing; choosing a project re-scopes the data tabs. **Settings** is
one hub with a left sub-nav that splits **Project** (General/Pipeline/Security) from
**Instance** (Product, API keys, Staff, Email) and Account.

- **Pros:** maximum width for dense charts and log tables; per-project is a filter, not
  a mode; project-vs-instance settings split is explicit on one screen.
- **Cons:** biggest departure from today; top-tabs scale worse than a sidebar if the
  section count grows.
- **Best for:** leaning into the "analytics product" identity.

## 5. Recommendation

**Ship Approach B now; treat Approach A as the target.**

B is a small, safe refactor of the existing sidebar that already fixes every pain in
§2 — and the route/loader work it needs (a real Fleet overview, surfacing the Workspace
tabs as an Instance group, an inline project picker) is exactly the groundwork A
needs too. If we later find power users juggling many projects, promoting the Project
group into A's drill-down mode is then an incremental step, not a rewrite. C is the
fallback if we decide to commit to a wider analytics-product layout.

## 6. Mapping to the current code (if we proceed)

| Mockup destination | Today | Change |
|---|---|---|
| Fleet › Overview | dashboard in `isAll` mode | promote to a dedicated route + comparison-focused layout |
| Project › Overview/Analytics/Logs | dashboard/analytics/logs with `?project=` | keep; reached inside project scope |
| Project › Settings | [settings](../../src/routes/app/settings/index.tsx) | keep; remove the "All projects" dead-end |
| Instance › Operations/API keys/Staff/Email | [workspace](../../src/routes/app/workspace/index.tsx) tabs | lift out of the avatar menu into a first-class nav group |
| Instance › Product settings | — (new) | instance-wide pipeline/cache/security defaults |
| Account | [account](../../src/routes/app/account/index.tsx) | unchanged |

## 7. Caveats

- The mockups are **static HTML** with **illustrative numbers**. Two of the four
  projects (Marketing Site, Mobile CDN) are invented to make the fleet table read
  well; the real seed ships Demo Shop + Demo Blog.
- Colours, type, spacing and components mirror the real OKLCH tokens from
  [`src/styles.css`](../../src/styles.css) via the shared
  [`assets/keenpix.css`](./assets/keenpix.css), so the look is faithful, but these are
  presentation prototypes — not wired to data or the real component library.
