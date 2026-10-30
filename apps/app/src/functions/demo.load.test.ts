import { describe, expect, it, vi } from 'vitest'
import { handleDemoRequest } from './demo'

vi.mock('@/server/deployment', () => ({ isCloud: () => true }))
describe('demo load receipt', () => {
  it('runs 50 cold requests, primes all variants, then runs 50 warm requests', async () => {
    const variants = ['avif', 'webp', 'jpeg'].flatMap((fmt) =>
      [50, 70, 85].flatMap((q) =>
        [320, 640, 960, 1200].map((w) => `fmt=${fmt}&q=${q}&w=${w}`),
      ),
    )
    let peakRss = process.memoryUsage().rss
    const sampler = setInterval(() => {
      peakRss = Math.max(peakRss, process.memoryUsage().rss)
    }, 5)
    const run = async () => {
      const results = await Promise.all(
        Array.from({ length: 50 }, async (_, i) => {
          const start = performance.now()
          const response = await handleDemoRequest(
            new Request(
              `https://keenpix.com/demo/img/og.png?${variants[i % variants.length]}`,
            ),
            'og.png',
          )
          await response.arrayBuffer()
          return { status: response.status, ms: performance.now() - start }
        }),
      )
      const latency = results.map((r) => r.ms).sort((a, b) => a - b)
      return {
        ok: results.filter((r) => r.status === 200).length,
        overloaded: results.filter((r) => r.status === 503).length,
        p50Ms: Math.round(latency[24]),
        p95Ms: Math.round(latency[47]),
        maxMs: Math.round(latency[49]),
      }
    }
    try {
      const cold = await run()
      for (const query of variants) {
        expect(
          (
            await handleDemoRequest(
              new Request(`https://keenpix.com/demo/img/og.png?${query}`),
              'og.png',
            )
          ).status,
        ).toBe(200)
      }
      const warm = await run()
      peakRss = Math.max(peakRss, process.memoryUsage().rss)
      process.stdout.write(
        JSON.stringify({
          event: 'demo_load_test',
          runtime: process.version,
          variants: variants.length,
          cold,
          warm,
          peakRssMiB: Math.round(peakRss / 1024 ** 2),
        }),
      )
      expect(cold.ok).toBe(8)
      expect(cold.overloaded).toBe(42)
      expect(warm.ok).toBe(50)
    } finally {
      clearInterval(sampler)
    }
  })
})
