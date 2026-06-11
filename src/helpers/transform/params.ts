import type { Fit, OutputFormat } from '@/shared/transform'

function clampInt(value: string | null, min: number, max: number) {
  if (!value) {
    return
  }
  const n = Number.parseInt(value, 10)
  if (Number.isNaN(n)) {
    return
  }
  return Math.min(max, Math.max(min, n))
}

function negotiateFormat(
  fmtParam: string | null,
  accept: string,
  autoFormat: boolean,
) {
  if (fmtParam && fmtParam !== 'auto' && isOutputFormat(fmtParam)) {
    return fmtParam
  }
  if (!autoFormat) {
    return 'jpeg'
  }
  if (accept.includes('image/avif')) {
    return 'avif'
  }
  if (accept.includes('image/webp')) {
    return 'webp'
  }
  return 'jpeg'
}

function isOutputFormat(value: string): value is OutputFormat {
  return (
    value === 'avif' || value === 'webp' || value === 'jpeg' || value === 'png'
  )
}

function isFit(value: string): value is Fit {
  return (
    value === 'cover' ||
    value === 'contain' ||
    value === 'fill' ||
    value === 'inside'
  )
}

export function parseTransformParams(
  sp: URLSearchParams,
  accept: string,
  defaults: { autoFormat: boolean; defaultQuality: number },
) {
  const fitParam = sp.get('fit') ?? 'cover'
  return {
    width: clampInt(sp.get('w'), 1, 5000),
    height: clampInt(sp.get('h'), 1, 5000),
    quality:
      clampInt(sp.get('q'), 30, 100) ??
      Math.min(100, Math.max(30, Math.round(defaults.defaultQuality))),
    dpr: clampInt(sp.get('dpr'), 1, 3) ?? 1,
    blur: clampInt(sp.get('blur'), 0, 1000),
    fit: isFit(fitParam) ? fitParam : 'cover',
    format: negotiateFormat(sp.get('fmt'), accept, defaults.autoFormat),
  }
}
