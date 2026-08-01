# Pricing and profitability review — July 16, 2026

## Executive decision

Custom-domain allowances should be owned and billed by the **organization**,
while every hostname must be attached to exactly one **project**. The
organization is the subscription boundary; the project is the routing,
allowlist, signing, analytics, and deletion boundary. Never grant one domain per
project while Business has unlimited projects, because that turns an apparently
finite plan benefit into an unlimited provider and support liability.

The recommended launch catalog is:

| Plan | Monthly | Included returned bytes | Projects | Seats | Included custom domains |
| --- | ---: | ---: | ---: | ---: | ---: |
| Basic | $9 | 100 GB | 5 | 3 | 0 |
| Pro | $19 | 400 GB | 25 | 10 | 1 per organization |
| Business | **$39** | 1,000 GB | Unlimited | 25 | 10 per organization |
| Extra domain pack | **$5** | — | — | — | +5 per organization |

Keep the published $0.08 / $0.06 / $0.05 per-GB overage rates. Business was
changed from $29 to $39, Pro from three domains to one, and Business from 25 to
ten. Those corrections are now reflected in both the repository catalog and
the production Polar catalog.

This is the best time to correct the offer: the deployed service has no paid
subscription records, so there are no customers to grandfather.

## What is actually live today

The production audit and repository are at different lifecycle stages:

- The deployed application image is `ghcr.io/lord007tn/keenpix:v0.1`.
- Its database is the legacy schema: one organization and one project, with no
  `Subscription`, `BillingCustomer`, `SubscriptionGrantAudit`, or `CustomDomain`
  tables.
- The authenticated Polar dashboard now verifies three public monthly products:
  Basic $9, Pro $19, and Business $39. Each combines its fixed fee with one
  shared `bandwidth_delivered` meter, uses the documented per-GB price, carries
  a 14-day trial, and has the matching 100/400/1,000 GB no-rollover meter-credit
  benefit. A fourth private product, Custom Domain Pack at $5/month, has no
  trial or bandwidth benefit and carries `addon=custom_domains`, `units=5`, and
  `interval=month` metadata. There are no customers, orders, or active
  subscriptions.
- The token currently deployed with v0.1 still returned HTTP 401 in a read-only
  API check. The catalog is correct, but production checkout remains blocked
  until v0.2 is deployed with a fresh correctly scoped Keenpix token.
- The repository's v0.2 billing, metered overage, plan entitlements, and custom
  domains are implemented locally but are not deployed.
- Production returned 144,585,329,036 bytes (134.66 GiB) across 2,323,694
  requests in the last 30 days.
- Resource rollups for that period show 3.75% average CPU, 100% peak CPU,
  1,885.9 MB average memory, and 3,905 MB peak memory.
- The live application currently holds 7.8 GB in its local transform cache. The
  host root disk is 66 GB used out of 150 GB.

Current application subscription revenue is therefore $0. Keenpix cannot be
described as profitable yet, and checkout readiness is blocked until the Polar
credential and v0.2 production deployment are completed.

## Current catalog and entitlements in the repository

| Benefit | Basic | Pro | Business | Current billing behavior |
| --- | ---: | ---: | ---: | --- |
| Monthly price | $9 | $19 | $39 | Repository and live Polar catalog agree |
| Returned bytes | 100 GB | 400 GB | 1,000 GB | Included meter credits verified in Polar |
| Overage | $0.08/GB | $0.06/GB | $0.05/GB | Always-on metered usage, billed at period end |
| Projects | 5 | 25 | Unlimited | Plan entitlement, no project add-on |
| Seats | 3 | 10 | 25 | Plan entitlement, no seat add-on |
| Custom domains | 0 | 1 | 10 | Organization quota; each hostname attaches to a project |
| Analytics | Core | Advanced | Advanced | Plan entitlement |
| Aggregate analytics | 90 days | 365 days | 365 days | Plan entitlement |
| Searchable raw logs | 30 days | 90 days | 365 days | Independently enforced retention |
| AI credits | 0 | 0 | 0 | Removed from the offer until a delivered cost model exists |
| Trial | 20 GB, 2 projects, 14 days | Same guardrail | Same guardrail | Trial usage is not billed |

The current code has two paid expansions: metered bandwidth overage and one
Business-only custom-domain pack (+5 domains for $5/month). Included domains
remain plan benefits. There are no purchasable seat packs, project packs,
annual plans, or AI-credit packs.

Numerical AI credits remain out of the customer-facing catalog until the
feature, model mix, token accounting, and maximum provider cost per credit are
defined. The intended model is included monthly AI credits followed by metered
credit overage on the same end-of-period invoice. Each operation must consume a
published credit amount derived from provider cost plus Keenpix margin; do not
promise a number before that conversion table is measured.

## Payment contribution

The Keenpix Polar organization is on the current Free merchant plan, verified
in its billing dashboard at **5% + $0.50 per transaction**. International cards
can add 1.5%. The table excludes tax, refunds, disputes, payout fees, and
currency conversion. Polar's paid $20/month plan does not become cheaper than
Free until roughly $1,379/month of sales, so upgrading Polar now would destroy
margin rather than improve it.

| Plan | Price | Domestic-card net | International-card net | Domestic net at full included usage |
| --- | ---: | ---: | ---: | ---: |
| Basic | $9 | $8.05 | $7.92 | 8.05¢/GB |
| Pro | $19 | $17.55 | $17.27 | 4.39¢/GB |
| Business | $39 | $36.55 | $35.97 | 3.66¢/GB |

The fixed $0.50 fee makes low-priced separate add-on transactions less
efficient. A +5-domain pack at $5/month contributes about $3.75 after a separate
Polar transaction and $0.50 of Cloudflare hostname cost outside the free pool.
If it can be consolidated into the main subscription transaction, incremental
contribution is about $4.25.

Sources:

- https://docs.polar.sh/merchant-of-record/fees
- https://docs.polar.sh/documentation/features/products

## Custom-domain cost and packaging

Cloudflare for SaaS includes 100 hostnames account-wide, then charges $0.10 per
additional hostname per month. The self-service ceiling is 50,000 hostnames.
The first 100 make early direct provider cost effectively zero, but they do not
make domains valueless: certificate/DNS troubleshooting, abuse review,
onboarding, and customer support dominate the $0.10 infrastructure cost.

Recommended policy:

1. Keep the database relationship `CustomDomain -> Project`.
2. Enforce allowance by counting domains across all projects in the
   organization, which the current repository implementation already does.
3. Basic uses the standard Keenpix delivery hostname.
4. Pro includes one custom domain for one production property.
5. Business includes ten for an agency or multi-brand company.
6. Sell +5 domains for $5/month. Packs belong to the organization and can be
   assigned across its projects.
7. Launch with one pack per Business organization, for a hard maximum of 15
   domains. Revisit multiple packs only after domain-support data exists.

Do not charge per project. Customers understand a hostname as the billable
resource, while a project is an internal organization and security primitive.

The repository now persists a separate organization-level add-on subscription,
maps its full Polar webhook lifecycle, exposes checkout only to an active paid
Business subscription, and adds five domains only while the add-on is entitled.
The separate record prevents an add-on webhook from replacing the primary plan
subscription. Existing hostnames are not taken offline after cancellation, but
new hostname creation returns to the included limit.

Source: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/plans/

## Infrastructure costs

### Current Hetzner/local-cache path

The live host has 4 vCPU, about 8 GB RAM, and a 150 GB root disk, but the exact
server SKU and invoice are not available in the repository or host metadata.
Do not substitute a guessed invoice in financial reporting.

Current reference pricing after Hetzner's June 15, 2026 adjustment puts a CX33
at $9.99/month excluding IPv4, while other 4-vCPU classes cost more. This is a
reference range, not a claim about the actual host. EU CX/CPX/CAX servers include
20 TB outgoing traffic, with excess traffic documented at about $1.20/TB.

At 134.66 GiB, the observed workload uses roughly 0.66% of a 20 TB traffic
allowance. Network transfer is not the current capacity problem. The 100% CPU
peak, 3.9 GB memory peak, local cache growth, and unknown support load are the
signals to monitor.

Sources:

- https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/
- https://docs.hetzner.com/robot/general/traffic/

### Email

Postmark Basic is $15/month for 10,000 emails, with extra email at $1.80 per
1,000. Treat $15 as a conservative fixed Keenpix cost until the account is
allocated across products using invoice data.

Source: https://postmarkapp.com/pricing

### Future R2 path

R2 is not the current production cache. Its cost belongs in a migration
sensitivity model, not today's profit calculation. Standard storage is
$0.015/GB-month, Class A writes are $4.50/million, Class B reads are
$0.36/million, and egress is free.

If every included returned GB were a unique variant retained for a full month,
storage alone would be approximately $1.50 / $6 / $15 for Basic / Pro /
Business before the account-wide free tier. This is deliberately pessimistic,
but it reveals the Business risk:

| Offer | Net after Polar | Max hostname cost beyond free pool | R2 full-allowance storage stress | Remaining before compute/fixed/support |
| --- | ---: | ---: | ---: | ---: |
| Basic $9 / 0 domains | $8.05 | $0.00 | $1.50 | $6.55 |
| Pro $19 / 1 domain | $17.55 | $0.10 | $6.00 | $11.45 |
| Business $39 / 10 domains | $36.55 | $1.00 | $15.00 | **$20.55** |

Source: https://developers.cloudflare.com/r2/pricing/

## Revenue scenarios

### The current 134.66 GiB workload as one customer

| Plan | Customer invoice | Domestic net after Polar | Comment |
| --- | ---: | ---: | --- |
| Basic | about $11.77 | about $10.68 | 34.66 GB of overage |
| Pro | $19.00 | $17.55 | Fits inside 400 GB |
| Business | $39.00 | $36.55 | Considerably under-utilized |

Basic remains cheaper than Pro until 225 GB/month. Pro remains cheaper than
Business until about 733.3 GB/month. These crossover points create a clean
upgrade ladder while keeping the lowest effective included-GB revenue behind a
meaningfully higher base fee.

### Fixed-cost break-even before variable delivery

Because the exact invoice allocation is unavailable, use scenario budgets:

| Monthly fixed allocation | Basic customers | Pro customers | Business customers |
| --- | ---: | ---: | ---: |
| $25 | 4 | 2 | 1 |
| $50 | 7 | 3 | 2 |

This is contribution break-even, not accounting profit. It excludes founder
time, support, refunds, disputes, backups, monitoring, domain support, and taxes.

### Overage contribution

Ignoring the already-paid fixed transaction charge, each extra GB contributes
about 7.60¢ / 5.70¢ / 4.75¢ after Polar's 5% domestic percentage for Basic /
Pro / Business. Hetzner's published $1.20/TB excess transfer is
roughly 0.12¢/GB. The network spread is healthy; cache-miss transform CPU,
storage churn, analytics writes, and support determine the true marginal cost.

## Log retention analysis

Aggregate analytics and raw request-log retention are now separate promises:

| Plan | Aggregate analytics | Searchable raw logs | Raw-log result cap | Full-text search |
| --- | ---: | ---: | ---: | --- |
| Basic | 90 days | 30 days | 200 rows per query | No |
| Pro | 365 days | 90 days | 500 rows per query | Yes |
| Business | 365 days | 365 days | 500 rows per query | Yes |

This preserves longer low-cost aggregate history without retaining the same
amount of raw detail on every tier. The live legacy database shows why the
separation matters:
2,708,757 raw log rows covering about 42 days occupy 1,593 MB, while 2,077,981
hourly-rollup rows occupy another 1,417 MB. A simple linear projection of that
legacy Postgres shape is roughly 1.1 GB / 3.4 GB / 13.8 GB of raw logs for
30/90/365 days for this one workload, before indexes grow further. ClickHouse
should compress better, but retention is still a per-customer storage and
operations promise.

Applied split:

| Plan | Aggregate analytics | Searchable raw logs | Search/export |
| --- | ---: | ---: | --- |
| Basic | 90 days | 30 days | Filters, no server full-text; current results export as NDJSON |
| Pro | 365 days | 90 days | Full search; current results export as NDJSON |
| Business | 365 days | 365 days | Full search; current results export as NDJSON |

There are no paid customers to grandfather, so this was applied during the safe
pre-launch window. Self-host retention remains operator-controlled.

## Always-on overage analysis

The overage rates remain far above direct network excess cost and create a
predictable upgrade curve. Basic, Pro, and Business now follow an always-on
paid-usage model: included bandwidth is consumed first, usage continues at the
published rate, and Polar charges accumulated overage at the end of the billing
period. Normal paid traffic never pauses because it crossed an allowance.

This matches the continuity expectation of a production delivery service and
keeps the invoice mechanically verifiable. The billing dashboard shows current
usage and projected overage, and email alerts fire at 80% and after the included
allowance is consumed. Trial usage remains bounded because it is free.

Runaway cost protection must be operational rather than a customer-facing
billing cutoff: signed URLs, origin allowlists, transform-dimension bounds,
queue/rate controls, anomaly alerts, payment-risk review, and the operator
suspension control. Reconcile Polar meter events against local usage before each
reporting watermark advances.

Future AI usage should use the same commercial shape with a separate meter:

1. Each plan receives a defined monthly quantity of AI credits.
2. Every AI operation records model, input/output units, provider cost, retail
   credits consumed, organization, and an idempotency key.
3. Included credits are deducted first; excess credits are invoiced at the
   published rate at period end without a normal customer hard stop.
4. Internal anomaly and fraud controls can throttle abusive automation without
   presenting ordinary customers with a billing cap.
5. Set the retail credit conversion only after the most expensive supported
   model path still leaves a target contribution margin after Polar fees.

Sources:

- https://vercel.com/docs/plans
- https://vercel.com/docs/spend-management
- https://polar.sh/docs/features/usage-based-billing/billing
- https://polar.sh/docs/features/usage-based-billing/credits

## Full entitlement review

| Item | Assessment | Decision |
| --- | --- | --- |
| Bandwidth | The only billed usage dimension; easy to explain and verify | Keep 100/400/1,000 GB and 8/6/5¢ overage |
| Transformations | Unlimited is compelling, but cache-busting variants can create CPU/storage abuse | Keep unlimited commercially; enforce technical width/quality/queue/rate guardrails |
| Projects | 5/25/unlimited is reasonable when expensive resources are org-scoped | Keep; never make domains inherit unlimited projects |
| Seats | 3/10/25 is enforced for new members and costs little directly | Keep; do not add seat billing until team demand appears |
| Analytics | Basic core versus Pro+ advanced is implemented; Business lacks an exclusive analytics benefit | Add Business CSV/raw-log export when retention is split |
| Logs | Raw detail is costlier than aggregate analytics | 30/90/365 raw days, with 90/365/365 aggregate analytics |
| Custom domains | Provider cost is low, but DNS/TLS support cost is real | Org quota, project assignment; 0/1/10 included |
| Domain pack | Separate subscriptions incur another fixed Polar fee but keep cancellation clear | One Business-only +5 pack for $5, max 15 domains/org |
| AI credits | Planned, but model costs and operation weights are not yet bounded | Included credits plus metered overage after measurement; separate AI meter |
| Trial | 14 days, 20 GB, two projects, no metered billing is safe for bandwidth | Limit trial custom domains to one total, or require conversion before domain activation |
| Self-host | Free/unlimited aligns with AGPL positioning; user pays infrastructure | Keep feature-complete and operator-controlled |
| Annual billing | Not implemented; discounting before churn/support data is guesswork | Wait for at least three months of paid cohort data |

The most important technical guardrail not yet represented in the commercial
table is unique-variant churn. Unlimited transformations should mean unlimited
legitimate transformations, not unlimited attacker-selected width/quality/query
combinations retained forever. Track unique cache writes and transform CPU per
organization, then introduce abuse protection rather than a confusing normal
transform fee.

## Launch blockers and measurements

Before accepting paid subscriptions:

1. Replace or re-scope the production Polar token. The three plans and private
   domain pack, fixed prices, shared usage meter, trials, included meter credits,
   and add-on metadata are now verified in Polar; the deployed app still needs
   working API credentials and an end-to-end checkout/webhook test.
2. Deploy the v0.2 database migrations and application. The live v0.1 database
   cannot persist subscriptions or custom domains.
3. Configure and verify Cloudflare for SaaS fallback origin, zone, token, and
   CNAME target before advertising domains as live.
4. Record the actual Hetzner, IPv4, backup, Postmark, Cloudflare, and monitoring
   invoice allocation monthly.
5. Track per organization: returned GB, unique cached GB, cache-hit ratio,
   cache-miss transforms, transform CPU seconds, peak queue depth, domains,
   support minutes, refunds, and Polar net receipts.
6. Reprice or reduce allowances when Business accounts average over 500 GB,
   unique cached bytes exceed 40% of returned bytes, or sustained host CPU
   exceeds 50%.

## Final recommendation

- **Ownership:** quota per organization; assignment per project.
- **Monetization:** custom domains are a paid plan differentiator plus a domain
  pack, not a free per-project entitlement.
- **Catalog:** keep Basic $9 and Pro $19; launch Business at $39 with 10 domains,
  or keep $29 only with 750 GB and five domains.
- **Add-on:** one +5 custom-domain pack for $5/month, maximum 15 per organization.
- **Delivered now:** Polar has Basic $9, Pro $19, Business $39, and a private
  $5 custom-domain pack; code and marketing use 0/1/10 organization-level
  custom-domain allowances, a Business-only +5 add-on entitlement, 30/90/365
  raw-log retention, and uninterrupted metered bandwidth overage. Numerical AI
  credit promises remain removed until the conversion table and margin are
  measured.
- **Status:** current revenue is $0. The commercial catalog is ready, but
  production billing is not launch-ready until v0.2, a valid Polar token, and
  checkout/webhook/custom-domain verification are deployed. Profitability
  cannot be claimed until real paid receipts exceed allocated infrastructure
  and support costs.
