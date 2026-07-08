// Only allow same-origin, root-relative paths as post-auth redirect targets, so a
// crafted ?redirect= can never bounce a signed-in user to an external site (open
// redirect). Rejects absolute URLs and protocol-relative (`//evil.com`) values.
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return
  }
  if (value.startsWith('//')) {
    return
  }
  return value
}
