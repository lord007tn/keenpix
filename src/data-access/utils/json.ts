export function jsonObject(value: string | null) {
  if (!value) {
    return null
  }

  let parsed: unknown = value
  for (let i = 0; i < 2; i++) {
    if (typeof parsed !== 'string') {
      break
    }
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }

  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed
    : null
}
