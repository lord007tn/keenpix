import { describe, expect, it } from 'vitest'
import { robotsText } from './robots[.]txt'

describe('public crawler policy', () => {
  it('allows public search crawlers without exposing app or API routes', () => {
    const robots = robotsText('https://keenpix.com')
    const groups = robots
      .split('\n\n')
      .filter((group) => group.startsWith('User-agent:'))

    expect(groups).toHaveLength(4)
    for (const [index, crawler] of [
      'OAI-SearchBot',
      'Googlebot',
      'Bingbot',
      '*',
    ].entries()) {
      const lines = groups[index].split('\n')
      const disallowRules = lines
        .filter((line) => line.startsWith('Disallow: '))
        .map((line) => line.slice('Disallow: '.length))
      const isDisallowed = (pathname: string) =>
        disallowRules.some((rule) =>
          rule.endsWith('$')
            ? pathname === rule.slice(0, -1)
            : pathname.startsWith(rule),
        )

      expect(lines).toContain(`User-agent: ${crawler}`)
      expect(lines).toContain('Allow: /')
      for (const pathname of ['/admin', '/api', '/app']) {
        expect(isDisallowed(pathname)).toBe(true)
        expect(isDisallowed(`${pathname}/settings`)).toBe(true)
      }
      expect(isDisallowed('/administrator')).toBe(false)
      expect(isDisallowed('/app-public')).toBe(false)
    }
    expect(robots).toContain('Sitemap: https://keenpix.com/sitemap.xml')
  })
})
