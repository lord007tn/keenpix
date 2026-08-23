import { globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const METHOD_CACHE_KEY = '$scheme$request_method$host$request_uri'

describe('public Nginx cache configuration', () => {
  it('keeps HEAD and GET on the default shared cache identity', () => {
    const directories = [
      join(process.cwd(), 'content'),
      join(process.cwd(), '..', 'docs', 'content'),
    ]

    for (const directory of directories) {
      for (const file of globSync('**/*.mdx', { cwd: directory })) {
        const content = readFileSync(join(directory, file), 'utf8')

        expect(content, file).not.toContain(METHOD_CACHE_KEY)
      }
    }
  })
})
