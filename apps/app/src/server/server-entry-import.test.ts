import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('server entry import boundary', () => {
  it('loads the public Markdown corpus only inside a qualifying request', async () => {
    const source = await readFile(
      new URL('../server.ts', import.meta.url),
      'utf8',
    )

    expect(source).not.toContain(
      "import { getPublicMarkdown } from '@/server/public-markdown'",
    )
    expect(source).toContain("await import('@/server/public-markdown')")
  })
})
