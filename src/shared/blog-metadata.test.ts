import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const TITLE = /^title:\s*(.+)$/m
const DESCRIPTION = /^description:\s*(.+)$/m
const IMAGE = /^image:\s*(.+)$/m
const IMAGE_ALT = /^imageAlt:\s*(.+)$/m
const SURROUNDING_QUOTES = /^['"]|['"]$/g
const MDX_EXTENSION = /\.mdx$/

describe('blog search metadata', () => {
  it('keeps every published title and description within snippet limits', () => {
    const directory = join(process.cwd(), 'content', 'blog')

    for (const file of readdirSync(directory).filter((name) =>
      name.endsWith('.mdx'),
    )) {
      const content = readFileSync(join(directory, file), 'utf8')
      const title = content
        .match(TITLE)?.[1]
        ?.trim()
        .replace(SURROUNDING_QUOTES, '')
      const description = content
        .match(DESCRIPTION)?.[1]
        ?.trim()
        .replace(SURROUNDING_QUOTES, '')
      const image = content.match(IMAGE)?.[1]?.trim()
      const imageAlt = content.match(IMAGE_ALT)?.[1]?.trim()
      const slug = file.replace(MDX_EXTENSION, '')

      expect(title, `${file} must have a title`).toBeTruthy()
      expect(description, `${file} must have a description`).toBeTruthy()
      expect(title?.length, `${file} title`).toBeLessThanOrEqual(60)
      expect(description?.length, `${file} description`).toBeLessThanOrEqual(
        160,
      )
      expect(image, `${file} image`).toMatch(
        new RegExp(`^/og/blog/${slug}\\.png\\?v=\\d{4}-\\d{2}-\\d{2}$`),
      )
      expect(imageAlt?.length, `${file} image alt`).toBeGreaterThan(20)
      expect(imageAlt?.length, `${file} image alt`).toBeLessThanOrEqual(160)
    }
  })
})
