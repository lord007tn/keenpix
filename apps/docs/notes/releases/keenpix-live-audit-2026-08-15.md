# Keenpix live audit evidence — August 15, 2026

This is the compact, reviewable record for the production audit. The full
SquirrelScan below followed the original history-rewritten deployment at
`360b88226812851dd3787c29ba1b160c4c271754`; the final regression release was
Coolify deployment `59c8ab26c5656b3e0707581cb73b1be47ff6575a`.

## Production checks

- Final Coolify deployment: success in 5 minutes.
- `https://keenpix.com/api/health`: `200` with healthy database, cache,
  ClickHouse, object storage, and transform queue checks.
- All 69 sitemap pages returned `200` with matching canonicals after the final
  deployment. All 47 unique advertised Open Graph, Twitter, and article images
  returned decodable images under fresh cache-busting, including every English
  and Arabic generated blog card.
- The managed-cloud quickstart renders the canonical
  `cdn.keenpix.com/p/YOUR_ID` path, the frameworks anchor no longer creates an
  internal redirect, and the five corrected content records expose accurate
  `2026-08-15` sitemap modification dates.
- The homepage's external ImageKit, imgix, Bunny, GitHub, and X links render
  explicit `rel="noopener noreferrer"` attributes.

## SquirrelScan crawl

- Tool: SquirrelScan `0.0.38`.
- Started: `2026-08-15T16:06:55.052Z`.
- Command: `squirrel audit https://keenpix.com -m 100 -C full -f markdown -r`.
- Coverage: 74 pages; the sitemap exposed 69 URLs.
- Overall score: `77/100 (C)`.
- Results: 6,960 passed, 465 warnings, and 71 failures.
- Links: `95/100`, zero errors, two expected warnings for the authenticated
  `/app` redirect to the sign-in page. The prior orphan-page and unsafe
  external-link findings are absent.
- Internationalization, structured data, legal compliance, mobile, social
  media, and URL structure: `100/100` each.

### Failure triage

The 71 failures comprise three known classes:

1. **46 image-alt findings:** scanner false positives repeated across 46 pages.
   The three reported image instances are decorative and intentionally use both
   `alt=""` and `aria-hidden="true"` in `src/components/app/keenpix-logo.tsx`
   and `src/features/marketing/marketing-page.tsx`.
2. **22 progressbar findings:** the third-party Fumadocs mobile table-of-contents
   SVG exposes `role="progressbar"` without an accessible name. This is an
   upstream component issue, not a missing label on a Keenpix-owned progress
   control.
3. **3 TTFB findings:** the crawler measured `/about` at 1,004 ms, `/compare` at
   1,132 ms, and `/legal/terms` at 1,034 ms. Immediate three-run verification
   measured 189–309 ms, 198–204 ms, and 195–208 ms respectively, all `200`, so
   the crawl readings are recorded as transient rather than a persistent
   regression.

No scanner failure is omitted from this breakdown.

## Raw evidence integrity

The full generated report remains a local operator artifact because it is large,
repetitive scanner output. It is not represented as a file available from the
public repository.

- Local filename: `output/keenpix-squirrelscan-94d8332-2026-08-15.md`
- SHA-256: `F5064170A57A57DA66EF5731BEB8CB6B6F7CB08DD66FD18234364207E855B011`

This compact record contains the release-relevant totals, category outcome,
complete failure classification, follow-up measurements, and raw-report digest
needed to verify the launch decision without committing generated crawl noise.
