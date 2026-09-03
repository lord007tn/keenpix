import { describe, expect, it } from 'vitest'
import { buildLlmsIndex } from './{$llmFile}[.]txt'

describe('concise LLM index', () => {
  it('discovers the new English guides without retired locale URLs', () => {
    const index = buildLlmsIndex()

    expect(index).toContain('/blog/user-upload-image-pipeline-design.md')
    expect(index).toContain('/blog/cache-invalidation-versioned-image-urls.md')
    expect(index).not.toContain('/blog/ar')
  })
})
