import type {
  ExtendWith,
  Fit,
  OutputFormat,
  ResizeKernel,
  ResizePosition,
} from './types'

const POSITION_VALUES = new Set<ResizePosition>([
  'attention',
  'bottom',
  'center',
  'centre',
  'east',
  'entropy',
  'left',
  'left bottom',
  'left top',
  'north',
  'northeast',
  'northwest',
  'right',
  'right bottom',
  'right top',
  'south',
  'southeast',
  'southwest',
  'top',
  'west',
])

const KERNEL_VALUES = new Set<ResizeKernel>([
  'cubic',
  'lanczos2',
  'lanczos3',
  'linear',
  'mitchell',
  'mks2013',
  'mks2021',
  'nearest',
])

const EXTEND_WITH_VALUES = new Set<ExtendWith>([
  'background',
  'copy',
  'mirror',
  'repeat',
])

const COLOR_RE = /^[#(),.%\w\s-]+$/
const SIZE_SEPARATOR_RE = /[x,]/
const EXTRACT_SEPARATOR_RE = /[,:x]/
const EXTEND_SEPARATOR_RE = /[,\s]+/

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

function clampFloat(value: string | null, min: number, max: number) {
  if (!value) {
    return
  }
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n)) {
    return
  }
  return Math.min(max, Math.max(min, n))
}

function parseBoolean(value: string | null) {
  if (value === null) {
    return false
  }
  const normalized = value.trim().toLowerCase()
  return (
    normalized === '' ||
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  )
}

function parseColor(value: string | null) {
  const trimmed = value?.trim()
  if (!trimmed || trimmed.length > 80 || !COLOR_RE.test(trimmed)) {
    return
  }
  return trimmed
}

function parseSize(value: string | null) {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed) {
    return {}
  }
  const [rawWidth, rawHeight] = trimmed.split(SIZE_SEPARATOR_RE, 2)
  return {
    width: clampInt(rawWidth || null, 1, 5000),
    height: clampInt(rawHeight || null, 1, 5000),
  }
}

function parseExtract(value: string | null) {
  const parts = value
    ?.split(EXTRACT_SEPARATOR_RE)
    .map((part) => Number.parseInt(part.trim(), 10))
  if (!parts || parts.length !== 4 || parts.some(Number.isNaN)) {
    return
  }
  const [left = 0, top = 0, width = 0, height = 0] = parts
  return {
    left: Math.min(50_000, Math.max(0, left)),
    top: Math.min(50_000, Math.max(0, top)),
    width: Math.min(5000, Math.max(1, width)),
    height: Math.min(5000, Math.max(1, height)),
  }
}

function parseExtend(value: string | null) {
  const parts = value
    ?.split(EXTEND_SEPARATOR_RE)
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
  if (!parts?.length || parts.length > 4 || parts.some(Number.isNaN)) {
    return
  }
  const values = parts.map((part) => Math.min(1000, Math.max(0, part)))
  const [top = 0, right = top, bottom = top, left = right] =
    values.length === 2 ? [values[0], values[1], values[0], values[1]] : values
  return { top, right, bottom, left }
}

function parsePosition(value: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/[-_]+/g, ' ')
  if (normalized && POSITION_VALUES.has(normalized as ResizePosition)) {
    return normalized as ResizePosition
  }
}

function parseKernel(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (normalized && KERNEL_VALUES.has(normalized as ResizeKernel)) {
    return normalized as ResizeKernel
  }
}

function parseExtendWith(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (normalized && EXTEND_WITH_VALUES.has(normalized as ExtendWith)) {
    return normalized as ExtendWith
  }
}

function parseTrim(value: string | null): number | true | undefined {
  if (value === null) {
    return
  }
  const threshold = clampInt(value, 0, 255)
  return threshold ?? (parseBoolean(value) ? true : undefined)
}

function parseSharpen(value: string | null): number | true | undefined {
  if (value === null) {
    return
  }
  return clampFloat(value, 0.000_001, 10) ?? true
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
    value === 'avif' ||
    value === 'gif' ||
    value === 'heif' ||
    value === 'jpeg' ||
    value === 'png' ||
    value === 'svg' ||
    value === 'tiff' ||
    value === 'webp'
  )
}

function isFit(value: string): value is Fit {
  return (
    value === 'cover' ||
    value === 'contain' ||
    value === 'fill' ||
    value === 'inside' ||
    value === 'outside'
  )
}

// Clamp the requested width to the project's max-width policy (0/null = no cap).
function capWidth(width: number | undefined, maxWidth: number | null) {
  if (width === undefined || !maxWidth || maxWidth <= 0) {
    return width
  }
  return Math.min(width, maxWidth)
}

export function parseTransformParams(
  sp: URLSearchParams,
  accept: string,
  defaults: {
    autoFormat: boolean
    defaultDpr: number
    defaultFit: Fit
    defaultQuality: number
    maxWidth: number | null
  },
) {
  const fitParam = sp.get('fit')
  const size = parseSize(sp.get('resize') ?? sp.get('s'))
  const extend = parseExtend(sp.get('extend'))
  const gamma = clampFloat(sp.get('gamma'), 1, 3)
  return {
    animated: parseBoolean(sp.get('animated') ?? sp.get('a')),
    background: parseColor(sp.get('background') ?? sp.get('bg')),
    width: capWidth(
      clampInt(sp.get('w'), 1, 5000) ?? size.width,
      defaults.maxWidth,
    ),
    height: clampInt(sp.get('h'), 1, 5000) ?? size.height,
    quality:
      clampInt(sp.get('q'), 30, 100) ??
      Math.min(100, Math.max(30, Math.round(defaults.defaultQuality))),
    dpr: clampInt(sp.get('dpr'), 1, 3) ?? defaults.defaultDpr,
    blur: clampInt(sp.get('blur'), 0, 1000),
    enlarge: parseBoolean(sp.get('enlarge')),
    extend: extend
      ? {
          ...extend,
          extendWith: parseExtendWith(sp.get('extendWith')),
        }
      : undefined,
    extract: parseExtract(sp.get('extract') ?? sp.get('crop')),
    fit: fitParam && isFit(fitParam) ? fitParam : defaults.defaultFit,
    flatten: parseBoolean(sp.get('flatten')),
    flip: parseBoolean(sp.get('flip')),
    flop: parseBoolean(sp.get('flop')),
    format: negotiateFormat(sp.get('fmt'), accept, defaults.autoFormat),
    gamma: gamma
      ? {
          gamma,
          gammaOut: clampFloat(sp.get('gammaOut'), 1, 3),
        }
      : undefined,
    grayscale: parseBoolean(sp.get('grayscale') ?? sp.get('greyscale')),
    kernel: parseKernel(sp.get('kernel')),
    median: clampInt(sp.get('median'), 1, 25),
    modulate:
      sp.has('brightness') ||
      sp.has('saturation') ||
      sp.has('hue') ||
      sp.has('lightness')
        ? {
            brightness: clampFloat(sp.get('brightness'), 0, 10),
            saturation: clampFloat(sp.get('saturation'), 0, 10),
            hue: clampInt(sp.get('hue'), -360, 360),
            lightness: clampFloat(sp.get('lightness'), -100, 100),
          }
        : undefined,
    negate: parseBoolean(sp.get('negate')),
    normalize: parseBoolean(sp.get('normalize') ?? sp.get('normalise')),
    position: parsePosition(
      sp.get('position') ?? sp.get('pos') ?? sp.get('gravity'),
    ),
    rotate: clampFloat(sp.get('rotate') ?? sp.get('r'), -360, 360),
    sharpen: parseSharpen(sp.get('sharpen')),
    threshold: clampInt(sp.get('threshold'), 0, 255),
    tint: parseColor(sp.get('tint')),
    trim: parseTrim(sp.get('trim')),
  }
}
