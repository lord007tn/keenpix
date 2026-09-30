# Repeated blocked image sources

Desktop and mobile screenshots show the actual `OriginAllowlistWarning` component with the application's stylesheet and TanStack Router. The fixture uses synthetic project names, hosts, and request counts; these are component previews, not production telemetry.

- [Desktop](desktop.jpg)
- [Mobile at 390px](mobile.jpg)

The review link was clicked and navigated to `/app/settings?project=project-example&section=security`. The fixture destination verifies link routing; the production settings page was not exercised in this preview. A recording is unnecessary for this static alert and ordinary navigation.

The warning uses tenant-scoped hourly rollups from roughly the past day, requires at least 100 HTTP 403 requests per project/source host, and checks the current allowlist. The hour overlapping the 24-hour cutoff is included in full, so the period ranges from 24 to just under 25 hours. Already allowed hosts and their subdomains disappear from the warning even when their historical failures remain. Missing files, upstream 5xx responses, malformed hosts, and IP addresses do not generate this warning. Users must recognize and trust a source before adding it.

Validation: 590 app tests passed, app typecheck passed, production app build passed, and changed source files passed Biome.
