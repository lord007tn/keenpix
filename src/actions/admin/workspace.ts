import {
  countApiKeyActivities,
  listApiKeyActivities,
  listInternalApiKeys,
} from '@/data-access/admin/api-keys'
import { listInvitations } from '@/data-access/admin/invitations'
import { getPublicSmtpSettings } from '@/data-access/admin/smtp'
import { listStaffUsers } from '@/data-access/admin/staff'
import { listProjects } from '@/data-access/projects'
import { ACTIVITY_PAGE_SIZE } from '@/schemas/admin'
import { DEFAULT_ORG, INTERNAL_API_KEY_CONFIG } from './constants'

export async function getAdminWorkspace() {
  const [
    users,
    invitations,
    smtp,
    apiKeys,
    apiKeyActivities,
    apiKeyActivitiesTotal,
    projects,
  ] = await Promise.all([
    listStaffUsers(),
    listInvitations(),
    getPublicSmtpSettings(),
    listInternalApiKeys(INTERNAL_API_KEY_CONFIG),
    listApiKeyActivities(INTERNAL_API_KEY_CONFIG, 0, ACTIVITY_PAGE_SIZE),
    countApiKeyActivities(INTERNAL_API_KEY_CONFIG),
    listProjects(DEFAULT_ORG),
  ])
  return {
    users,
    invitations,
    smtp,
    apiKeys,
    apiKeyActivities,
    apiKeyActivitiesTotal,
    projects,
  }
}
