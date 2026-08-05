import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const TITLE = /^title:\s*(.+)$/m
const DESCRIPTION = /^description:\s*(.+)$/m
const IMAGE = /^image:\s*(.+)$/m
const IMAGE_ALT = /^imageAlt:\s*(.+)$/m
const COVER = /^cover:\s*(.+)$/m
const COVER_ALT = /^coverAlt:\s*(.+)$/m
const OG_IMAGE = /^ogImage:\s*(.+)$/m
const LEADING_SLASH = /^\//
const QUERY_STRING = /\?.*$/
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
      const cover = content.match(COVER)?.[1]?.trim()
      const coverAlt = content.match(COVER_ALT)?.[1]?.trim()
      const ogImage = content.match(OG_IMAGE)?.[1]?.trim()
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

      if (cover || coverAlt || ogImage) {
        expect(cover, `${file} editorial cover`).toMatch(
          new RegExp(
            `^/editorial/${slug}-cover\\.webp\\?v=\\d{4}-\\d{2}-\\d{2}$`,
          ),
        )
        expect(coverAlt?.length, `${file} cover alt`).toBeGreaterThan(20)
        expect(coverAlt?.length, `${file} cover alt`).toBeLessThanOrEqual(160)
        expect(ogImage, `${file} social image`).toMatch(
          new RegExp(`^/editorial/${slug}-og\\.jpg\\?v=\\d{4}-\\d{2}-\\d{2}$`),
        )
      }
    }
  })

  it('keeps authored editorial assets optimized and correctly sized', async () => {
    const directory = join(process.cwd(), 'content', 'blog')

    for (const file of readdirSync(directory).filter((name) =>
      name.endsWith('.mdx'),
    )) {
      const content = readFileSync(join(directory, file), 'utf8')
      const cover = content.match(COVER)?.[1]?.trim()
      const ogImage = content.match(OG_IMAGE)?.[1]?.trim()

      if (!(cover && ogImage)) {
        continue
      }

      const coverPath = join(
        process.cwd(),
        'public',
        cover.replace(QUERY_STRING, '').replace(LEADING_SLASH, ''),
      )
      const ogImagePath = join(
        process.cwd(),
        'public',
        ogImage.replace(QUERY_STRING, '').replace(LEADING_SLASH, ''),
      )
      const coverMetadata = await sharp(coverPath).metadata()
      const ogImageMetadata = await sharp(ogImagePath).metadata()

      expect(coverMetadata.format, `${file} cover format`).toBe('webp')
      expect(coverMetadata.width, `${file} cover width`).toBe(1600)
      expect(coverMetadata.height, `${file} cover height`).toBe(900)
      expect(statSync(coverPath).size, `${file} cover size`).toBeLessThan(
        180_000,
      )
      expect(ogImageMetadata.format, `${file} social format`).toBe('jpeg')
      expect(ogImageMetadata.width, `${file} social width`).toBe(1200)
      expect(ogImageMetadata.height, `${file} social height`).toBe(630)
      expect(statSync(ogImagePath).size, `${file} social size`).toBeLessThan(
        180_000,
      )
    }
  })
})
