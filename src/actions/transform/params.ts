import type { Fit, OutputFormat } from '@/lib/sharp/transform'

const FORMATS = [
  'avif',
  'webp',
  'jpeg',
  'png',
] as const satisfies readonly OutputFormat[]
const FITS = [
  'cover',
  'contain',
  'fill',
  'inside',
] as const satisfies readonly Fit[]

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
  if (
    fmtParam &&
    fmtParam !== 'auto' &&
    FORMATS.includes(fmtParam as OutputFormat)
  ) {
    return fmtParam as OutputFormat
  }
  // fmt=auto or omitted: negotiate from Accept only when the project allows it;
  // otherwise serve a universally-compatible JPEG.
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
    fit: FITS.includes(fitParam as Fit) ? (fitParam as Fit) : 'cover',
    format: negotiateFormat(sp.get('fmt'), accept, defaults.autoFormat),
  }
}
