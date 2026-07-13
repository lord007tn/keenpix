const REDIRECT_BASE = 'https://keenpix.invalid'

function hasUnsafeRedirectSyntax(value: string) {
  if (value.startsWith('//')) {
    return true
  }
  return [...value].some((character) => {
    const code = character.charCodeAt(0)
    return character === '\\' || code <= 31 || code === 127
  })
}

// Only allow normalized same-origin paths as post-auth redirect targets. URL
// parsers treat backslashes as slashes for HTTPS URLs, so checking only for a
// leading `//` is insufficient (`/\\evil.example` becomes an external URL).
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return
  }

  // Validate decoded forms too. Search params arrive decoded once, while a
  // crafted double-encoded value may be decoded again by another auth hop.
  let decoded = value
  for (let pass = 0; pass < 3; pass++) {
    if (hasUnsafeRedirectSyntax(decoded)) {
      return
    }
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        break
      }
      decoded = next
    } catch {
      return
    }
  }
  if (hasUnsafeRedirectSyntax(decoded)) {
    return
  }

  try {
    const target = new URL(value, REDIRECT_BASE)
    if (target.origin !== REDIRECT_BASE) {
      return
    }
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return
  }
}
