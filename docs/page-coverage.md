# Public page coverage

Reviewed: 2026-09-11. Next review: 2026-10-11. Paths are canonical paths on https://keenpix.com. This is a contributor content map, not a ranking report.

| Type | Canonical owner | Decision | Distinct intent and proof |
| --- | --- | --- | --- |
| Competitor alternatives | /compare; /compare/cloudinary-alternative and eight other registered comparisons | Keep; improve Cloudinary | Replace an existing provider. `features/compare/comparison-data.ts` owns nine comparisons with migration steps and competitor wins. No second alternatives directory. |
| Honest comparisons | /compare/cloudinary-alternative; /methodology/comparisons | Improve | Evaluate billing and service boundaries. Alternatives and versus searches share one owner. Cloudinary prices and separate Assets offering checked at https://cloudinary.com/pricing on 2026-09-11. Other vendor reviews retain their original dates; this batch does not certify a fresh audit of every vendor. |
| Real integrations | /integrations; /docs/frameworks/react | Add hub; improve React | Select a markup adapter, HTTP origin or management SDK. Proof: `packages/frameworks/{next,react,vue,core}`, `packages/sdk` and /docs/frameworks/catalog. HTTP compatibility is not a storage connector. |
| Truthful constraints | /self-hosted-image-cdn; /integrations | Improve | Evaluate AGPL deployment versus managed delivery without a package. Proof: LICENSE, release v0.3.2, deployment files and core URL generation. Self-hosting requires operations; managed trial requires a card. No no-card page. |
| Pricing / free versus paid | /pricing; /image-cdn-cost-calculator; /blog/self-host-vs-managed-image-optimization | Keep | Choose paid delivery versus operating infrastructure. Proof: `src/lib/billing/plans.ts`, billing actions and public pricing. No packaging change. Trial is not a permanent free plan. |
| Use cases | /blog/ecommerce-product-image-delivery; /blog/user-upload-image-pipeline-design | Add catalog workflow; keep uploads | Product grids, galleries, crop fidelity and catalog updates differ from ingesting untrusted uploads. Proof: transform parameters, framework packages, source allowlists and cache behavior. No commerce plugin or conversion claim. |
| Problems | /blog/image-delivery-troubleshooting-by-symptom; /blog/cache-invalidation-versioned-image-urls | Keep | Diagnose failures and stale images rather than choose a vendor. Existing guides include checks and recovery boundaries; catalog guide links to them. |
| Differentiating features | /blog/bring-your-own-origin-image-cdn-architecture; /blog/signed-image-urls-hmac; /self-hosted-image-cdn | Keep; improve self-host limits | Existing origins, server-generated signatures and AGPL deployment are concrete choices. Proof: signing tests, source configuration and release license. No exclusivity or generally available AI claim. |
| Company size | /pricing; /docs/getting-started/projects | Not applicable as new pages | No distinct small-business/enterprise image workflow verified. Existing project and plan owners answer the requirements; headcount pages would duplicate them. |

## Review rules for product changes

1. Review this map when changing a feature, adapter, license, plan or activation path. Keep one canonical owner per decision; update its hub links and evidence instead of creating near-duplicates.
2. Check volatile facts against official sources. Record actual check dates and next reviews; never advance dates without checking. Preserve competitor strengths, omissions and total-cost caveats.
3. New static routes need sitemap registration, canonical redirect handling, Markdown discovery and useful public Markdown. Blog guides need learning classification. Existing tests enforce discovery and Markdown coverage. Do not add visible Markdown controls.
4. Preserve the current English-only publication architecture. Retired Arabic blog URLs redirect to English owners. Add reciprocal hreflang only if complete translations actually ship.
5. Verify rendered metadata, robots, sitemap, links and activation. Check 320px, 390px and desktop, table scrolling and consent-denied fresh visits. Use Article schema for guides; never fabricate ratings.
6. Run app tests, typecheck, build and repository lint. Keep secrets, customer metrics, browser profiles and operational reports outside the public repository. PR screenshots must contain only public content. Docker images remain manually triggered.

## Scope of proof

Source and public documentation establish implementation boundaries, not successful customer activation, deployment, indexation or traffic improvement. A signup link does not establish completed billing or image delivery. Public pricing was read on 2026-09-11 at https://keenpix.com/pricing; no paid checkout was performed.
