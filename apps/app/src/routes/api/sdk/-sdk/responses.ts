export function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    headers: { 'cache-control': 'no-store', ...init?.headers },
    status: init?.status,
  })
}

export function jsonError(message: string, status: number) {
  return json({ error: message }, { status })
}

export async function readJson(request: Request) {
  const text = await request.text()
  if (!text.trim()) {
    return {}
  }
  return JSON.parse(text)
}
