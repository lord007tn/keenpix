import { describe, expect, it } from 'vitest'
import { robotsText } from './robots[.]txt'

describe('public crawler policy', () => {
  it('allows public search crawlers without exposing app or API routes', () => {
    const robots = robotsText('https://keenpix.com')

    for (const crawler of ['OAI-SearchBot', 'Googlebot', 'Bingbot']) {
      expect(robots).toContain(`User-agent: ${crawler}\nAllow: /`)
    }
    expect(robots.match(/Disallow: \/app\//g)).toHaveLength(4)
    expect(robots.match(/Disallow: \/api\//g)).toHaveLength(4)
    expect(robots.match(/Disallow: \/admin\//g)).toHaveLength(4)
    expect(robots).toContain('Sitemap: https://keenpix.com/sitemap.xml')
  })
})
