import { orgCanServe } from './quota'

// Cheap, TTL-cached entitlement check for the hot public transform path, so a
// per-request subscription lookup doesn't hit Postgres on every image. Self-host
// short-circuits inside orgCanServe() (always true), so this is effectively free
// there. Trade-off: up to TTL_MS of lag when an org subscribes or lapses.
const TTL_MS = 60_000
const cache = new Map<string, { at: number; entitled: boolean }>()

export async function orgEntitledForServing(orgId: string): Promise<boolean> {
  const now = Date.now()
  const hit = cache.get(orgId)
  if (hit && now - hit.at < TTL_MS) {
    return hit.entitled
  }
  const entitled = await orgCanServe(orgId)
  cache.set(orgId, { at: now, entitled })
  return entitled
}
