import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { getOldestPaidUsageReportAt } from '@/data-access/usage'

dayjs.extend(utc)

export async function verifyUsageCaptureCoverage(input: {
  coveredFrom: Date
  coveredUntil: Date
  through: Date
}) {
  const oldest = await getOldestPaidUsageReportAt()
  if (!oldest) {
    return { required: false }
  }
  if (
    dayjs.utc(oldest).isBefore(input.coveredFrom) ||
    dayjs.utc(input.through).isAfter(input.coveredUntil)
  ) {
    throw new Error(
      'Cloudflare project-edge coverage does not contain every pending billing window.',
    )
  }
  return { required: true }
}
