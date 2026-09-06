# Analytics source split evidence

Local Chrome screenshots use the actual SourceSplitCards component, SourceSplitCard UI and production stylesheet with synthetic input at 320 × 900 and 1440 × 900. They are local rendering evidence, not live analytics or production acceptance.

- Empty window: zero edge/origin bytes produce zero source shares and empty bars.
- All requests failed: ten requests, zero delivered, zero cache hits and zero optimizations produce zero request-source shares. Missing edge data is omitted rather than invented.

No document overflow was observed. This is a static data-display correction, so no recording is needed to demonstrate motion or interactions. Focused regressions also cover all-edge/all-origin bytes, all-cache/all-optimized requests and mixed successful/failed traffic. The cache-hit metric retains its successful-delivery denominator, while request-source shares use the total-request headline.
