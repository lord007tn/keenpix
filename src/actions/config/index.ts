import { isSelfHosted } from '@/lib/deployment'

export function getPublicConfig() {
  return { selfHost: isSelfHosted() }
}
