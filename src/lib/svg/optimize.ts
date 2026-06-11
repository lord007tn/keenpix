import type { Config } from 'svgo'
import { optimize } from 'svgo'
import { TransformError } from '@/errors/transform'

const SVG_START_RE =
  /^\uFEFF?\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)?(?:<!DOCTYPE\s+svg[^>]*>\s*)?<svg(?:[\s>/]|$)/i

const SVGO_CONFIG: Config = {
  multipass: true,
  plugins: [
    { name: 'preset-default' },
    { name: 'removeScripts' },
    {
      name: 'removeAttrs',
      params: {
        attrs: [
          '.*:on.*:.*',
          '.*:href:javascript:.*',
          '.*:xlink\\:href:javascript:.*',
        ],
      },
    },
  ],
}

function isSvgSource(source: string) {
  return SVG_START_RE.test(source)
}

export function optimizeSvgImage(input: Buffer) {
  const source = input.toString('utf8')
  if (!isSvgSource(source)) {
    throw new TransformError('Origin is not a valid SVG', 502)
  }

  try {
    const result = optimize(source, SVGO_CONFIG)
    return Buffer.from(result.data)
  } catch {
    throw new TransformError('Origin is not a valid SVG', 502)
  }
}
