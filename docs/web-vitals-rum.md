# Web Vitals RUM contract

Keenpix Cloud samples 10% of consented production page visits after hydration settles and reports CLS, INP, and LCP to `POST /api/web-vitals`. The reporter does not run in development or self-host mode, skips browsers with Do Not Track enabled, and does not start until the shared analytics-consent state is granted. Granting consent on the current page starts the sampled reporter without a reload. Revoking consent suppresses future reports immediately without registering a second Web Vitals loader if consent is later restored. The reporter omits credentials and sends no user, organization, cookie, IP, URL query, referrer, user-agent, or DOM-content field.

The endpoint is cloud-only and same-origin. It rejects payloads over 2 KiB and validates every field before writing one structured Pino event:

```json
{
  "event": "web_vital",
  "webVital": {
    "version": 1,
    "name": "LCP",
    "value": 1842.4,
    "delta": 1842.4,
    "rating": "good",
    "id": "v5-…",
    "navigationType": "navigate",
    "route": "/",
    "deviceClass": "phone",
    "viewport": { "width": 390, "height": 844 }
  }
}
```

The later analytics pipeline should consume `event = "web_vital"`, retain `version`, and aggregate p75 by `name`, `route`, and `deviceClass`. Do not join events to access logs, users, sessions, cookies, or IP addresses. Treat lab Lighthouse metrics separately from this field data, and wait for a representative sample before making a Core Web Vitals pass/fail claim.
