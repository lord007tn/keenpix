import { existsSync, globSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { RETIRED_ARABIC_BLOG_REDIRECTS } from './blog-redirects'

const TITLE = /^title:\s*(.+)$/m
const DESCRIPTION = /^description:\s*(.+)$/m
const IMAGE = /^image:\s*(.+)$/m
const IMAGE_ALT = /^imageAlt:\s*(.+)$/m
const COVER = /^cover:\s*(.+)$/m
const COVER_ALT = /^coverAlt:\s*(.+)$/m
const OG_IMAGE = /^ogImage:\s*(.+)$/m
const LANGUAGE = /^language:\s*(.+)$/m
const LEADING_SLASH = /^\//
const QUERY_STRING = /\?.*$/
const SURROUNDING_QUOTES = /^['"]|['"]$/g
const MDX_EXTENSION = /\.mdx$/
const MARKDOWN_LINK = /\]\(\/[^)]+\)/g
const TRANSLATION_KEY = /^translationKey:/m
const WHITESPACE = /\s+/

describe('blog search metadata', () => {
  it('keeps every published title and description within snippet limits', () => {
    const directory = join(process.cwd(), 'content', 'blog')

    for (const file of globSync('**/*.mdx', { cwd: directory })) {
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
      const slug = file.replace(MDX_EXTENSION, '').replaceAll('\\', '/')

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

    for (const file of globSync('**/*.mdx', { cwd: directory })) {
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

  it('keeps the published corpus English-only with valid redirect targets', () => {
    const directory = join(process.cwd(), 'content', 'blog')

    for (const file of globSync('**/*.mdx', { cwd: directory })) {
      const content = readFileSync(join(directory, file), 'utf8')
      const language = content.match(LANGUAGE)?.[1]?.trim() ?? 'en'
      expect(language, file).toBe('en')
      expect(
        content,
        `${file} must not carry translation metadata`,
      ).not.toMatch(TRANSLATION_KEY)
    }

    for (const target of Object.values(RETIRED_ARABIC_BLOG_REDIRECTS)) {
      if (target === '/blog') {
        continue
      }
      const slug = target.slice('/blog/'.length)
      expect(existsSync(join(directory, `${slug}.mdx`)), target).toBe(true)
    }
  })

  it('routes comparison-intent links to the dedicated canonical owners', () => {
    const directory = join(process.cwd(), 'content', 'blog')
    const content = globSync('**/*.mdx', { cwd: directory })
      .map((file) => readFileSync(join(directory, file), 'utf8'))
      .join('\n')

    expect(content).toContain('](/compare/cloudinary-alternative)')
    expect(content).toContain('](/compare/imgix-alternative)')
    expect(content).not.toContain('](/blog/keenpix-vs-cloudinary)')
    expect(content).not.toContain('](/blog/keenpix-vs-imgix)')
  })

  it('keeps the two new guides substantial, linked, and answer-first', () => {
    const directory = join(process.cwd(), 'content', 'blog')
    for (const file of [
      'user-upload-image-pipeline-design.mdx',
      'cache-invalidation-versioned-image-urls.mdx',
    ]) {
      const content = readFileSync(join(directory, file), 'utf8')
      const body = content.slice(content.indexOf('---', 3) + 3).trim()
      const words = body.split(WHITESPACE).filter(Boolean)

      expect(words.length, `${file} word count`).toBeGreaterThanOrEqual(1500)
      expect(
        content.match(MARKDOWN_LINK)?.length,
        `${file} internal links`,
      ).toBeGreaterThanOrEqual(5)
      expect(
        body.split('\n')[0]?.length,
        `${file} answer-first opening`,
      ).toBeGreaterThan(80)
    }
  })

  it('strengthens the existing canonical owners without duplicate topic pages', () => {
    const directory = join(process.cwd(), 'content', 'blog')
    const owners = {
      'agent-assisted-image-cdn-integration.mdx':
        'Offline mocks prove contracts, not provider behavior',
      'avif-vs-webp-production-caching.mdx': 'When an AVIF transform fails',
      'image-transform-cache-stampedes-capacity.mdx':
        'Request-rate caps and cold-work admission are different',
      'secure-image-pipelines-ssrf-image-bombs.mdx':
        'Animation limits do not provide moderation',
      'transparent-image-cdn-pricing.mdx': 'Cache-hit billing, case by case',
    }

    for (const [file, heading] of Object.entries(owners)) {
      expect(readFileSync(join(directory, file), 'utf8'), file).toContain(
        `## ${heading}`,
      )
    }
  })
})
