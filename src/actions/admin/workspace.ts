import { listInvitations } from '@/data-access/admin/invitations'
import { listStaffUsers } from '@/data-access/admin/staff'

// Operator staff workspace: the self-host staff/invitation surface. (API keys
// are an org-scoped tenant feature — see src/actions/api-keys.ts — and CDN/CF
// config is surfaced by getPlatformConfig, so neither lives here anymore.)
export async function getAdminWorkspace() {
  const [users, invitations] = await Promise.all([
    listStaffUsers(),
    listInvitations(),
  ])
  return { users, invitations }
}
