# Homepage live demo: local evidence

2026-10-30, Windows, Node 26.13.0. Synthetic local configuration only. No deployment performed.

## Scope and bounds

One sample: the existing Keenpix brand card, verified by sharp metadata as a single-frame 1200 x 630 PNG, 126912 bytes. Vite embeds the original bytes in the server bundle. No source URL, network fetch, project, entitlement, customer cache, activation, outbox or usage reporter enters the demo action. Tests fail if those customer modules are loaded and spy on global fetch. Actual sharp calls are instrumented to verify serial encodes and identical-variant coalescing.

36 variants; one active encode, eight admitted callers total (including active and coalesced callers), 32 MiB LRU. All admission slots release on success or failure. Aggregate logs use a bounded histogram; p95EncodeMs is an approximate upper bucket boundary capped at the observed maximum, not an exact percentile. The demo uses the real transform pipeline and its own bounded cache; the honesty block names that distinction.

## Local checks

`NODE_OPTIONS=--no-experimental-webstorage pnpm run health` passed on the implementation (lint, workspace typecheck/tests, knip, React Doctor and all builds). The Node 26 flag avoids the existing localStorage suite incompatibility. Additional focused endpoint/SSR tests pass. Knip emits configuration hints; React Doctor emits warnings, without errors.

Built app HTTP verification: 200 with 7170-byte WebP, 960 x 504, original bytes 126912; process cache HIT on repetition; all requested success headers present; no Set-Cookie or request-id. Invalid fmt=auto returned 400 text/plain with no-store, including with Accept: text/markdown. Cold overloads returned 503 with Retry-After: 60 and no-store. No global request log is emitted for /demo/.

## Reproducible load

Run `pnpm --filter @keenpix/app exec vitest run src/functions/demo.load.test.ts` in isolation. It fires 50 concurrent requests distributed over all 36 variants, primes the complete set sequentially, then fires 50 concurrent warm requests.

Isolated real-engine harness: peak sampled RSS 133 MiB; cold 8 successful / 42 overloaded, p50 5 ms, p95 436 ms, max 760 ms; warm 50 successful / 0 overloaded, p50/p95/max 2 ms. This is the test process, not whole-app memory.

Built app over localhost HTTP, same cold/prime/warm sequence: process peak resident working set 337 MiB (Windows PeakWorkingSet64); cold 8 successful / 42 overloaded, p50 6153 ms, p95 6856 ms, max 7225 ms; warm 50 successful / 0 overloaded, p50 11 ms, p95 19 ms, max 20 ms. This includes app startup/JIT and background retries against deliberately unreachable local backing services, and is not a production latency prediction. No backing services were provisioned.

## Visual evidence limitation

Desktop and 390 x 844 screenshots and interaction recording could not be captured: the personal Chrome browser integration returned "The browser access host is unavailable"; the native fallback returned "failed to activate captured window". No screenshots from another profile are substituted. Equivalent evidence is the SSR test (`live-demo.test.ts`), response-header checks, and real-engine tests. Visual layout, focus behavior, image-codec failure and live switching still require browser acceptance by the coordinator. The SSR test confirms the default image, working URL/Open link, controls and honesty block exist before JavaScript and no savings number is invented.

## Cloudflare verification and remaining production acceptance

Checked the official current default-cache documentation: https://developers.cloudflare.com/cache/concepts/default-cache-behavior/ . Cloudflare caches based on extension (PNG included), respects public/max-age, and avoids responses with Set-Cookie or no-store. The recognised .png path and explicit format avoid reliance on Vary: Accept. `no-transform` prohibits intermediate transformation. No dashboard settings changed. Local headers prove eligibility only; the coordinator must confirm an actual edge HIT on deployed production.

```sh
curl -sS -D - 'https://keenpix.com/demo/img/og.png?fmt=webp&q=70&w=960' -o /dev/null
# Repeat: 200, image/webp, Cache-Control: public, max-age=86400, no-transform
# Don't expect Content-Length: the origin sets it, but on 2026-10-30 Cloudflare omitted it
# from 16 of 18 cached responses across three variants, over both HTTP/1.1 and HTTP/2.
# X-Keenpix-Original-Bytes: 126912; output width 960, height 504, format webp
# X-Keenpix-Cache: HIT or MISS; X-Robots-Tag: noindex; Timing-Allow-Origin: *
# No Set-Cookie. Repeated production request must eventually show CF-Cache-Status: HIT.
curl -sS -D - 'https://keenpix.com/demo/img/og.png?fmt=auto&q=70&w=960'
# 400 text/plain; Cache-Control: no-store; documented parameter error.
curl -sS -D - 'https://keenpix.com/demo/img/missing.png?fmt=webp&q=70&w=960'
# 400, no-store. Self-host: 404, no-store even for valid input.
curl -sS 'https://keenpix.com/'
# HTML strings: Live Keenpix engine demo; id="demo"; See it live;
# /demo/img/og.png?fmt=avif; /demo/img/og.png?fmt=webp; /demo/img/og.png?fmt=jpeg;
# no account, allowlist, or billing; Open image; Start free trial in mobile navigation.
curl -sS 'https://keenpix.com/index.md'
# Try it without an account; accepted values; response headers; Not a customer project and not metered.
```

Do not stress production merely to force 503: reproduce that through the local load test. Confirm 5-minute nonzero demo_usage aggregates contain only bounded sample/format counts and encode timing. Confirm /demo is absent from sitemap and Markdown negotiation. No changes to packages/transform, transform app, worker, database schema, providers or CI workflows.
