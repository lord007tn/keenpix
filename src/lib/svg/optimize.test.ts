import { describe, expect, it } from 'vitest'
import { TransformError } from '@/errors/transform'
import { optimizeSvgImage } from './optimize'

describe('optimizeSvgImage', () => {
  it('optimizes SVGs and removes active content', () => {
    const result = optimizeSvgImage(
      Buffer.from(
        `<?xml version="1.0"?>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
          <script>alert(1)</script>
          <a href="JaVaScRiPt:alert(1)" xlink:href="javascript:alert(1)">
            <rect onclick="alert(1)" width="10" height="10" fill="#000000" />
          </a>
        </svg>`,
      ),
    ).toString('utf8')

    expect(result).toContain('<svg')
    expect(result).toContain('viewBox="0 0 10 10"')
    expect(result).not.toContain('<script')
    expect(result).not.toContain('onclick')
    expect(result.toLowerCase()).not.toContain('javascript:')
  })

  it('rejects non-SVG input', () => {
    expect(() => optimizeSvgImage(Buffer.from('<html></html>'))).toThrow(
      TransformError,
    )
  })
})
