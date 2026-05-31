/**
 * Cross-cutting formatters, used across analytics, logs, and dashboard surfaces.
 */

/** Human-readable byte sizes: 1536 -> "1.5 KB". */
export function fmtBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  )
  const value = bytes / 1024 ** i
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`
}

/** Compact numbers: 1234 -> "1.2K", 1_200_000 -> "1.2M". */
export function fmtNum(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) {
    return '0'
  }
  const abs = Math.abs(n)
  if (abs < 1000) {
    return String(Math.round(n))
  }
  const units = [
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ]
  for (const { v, s } of units) {
    if (abs >= v) {
      return `${(n / v).toFixed(decimals)}${s}`
    }
  }
  return String(n)
}

/** Percentage with sign: 0.142 -> "+14.2%". */
export function fmtPct(ratio: number, decimals = 1): string {
  const pct = ratio * 100
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(decimals)}%`
}
