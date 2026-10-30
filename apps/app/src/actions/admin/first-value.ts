import { getFirstValueFunnelReadout } from '@keenpix/database/activation'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

const MAX_FUNNEL_DAYS = 366
const RECENT_FUNNEL_DAYS = 30

// Shared by the operator readout and the staff card, so both report one contract.
// Only complete, whole UTC days qualify: a partial day would read as a low total.
export async function getFirstValueFunnel(input: { from: string; to: string }) {
  const from = dayjs.utc(input.from)
  const to = dayjs.utc(input.to)
  if (
    !(
      from.isValid() &&
      to.isValid() &&
      from.isSame(from.startOf('day')) &&
      to.isSame(to.startOf('day'))
    )
  ) {
    throw new Error('The daily funnel requires whole UTC day boundaries.')
  }
  if (
    !from.isBefore(to) ||
    to.diff(from, 'day') > MAX_FUNNEL_DAYS ||
    to.isAfter(dayjs.utc().startOf('day'))
  ) {
    throw new Error(
      `The daily funnel requires from < to, at most ${MAX_FUNNEL_DAYS} days, and no incomplete UTC day.`,
    )
  }
  const readout = await getFirstValueFunnelReadout({
    fromDay: from.format('YYYY-MM-DD'),
    toDay: to.format('YYYY-MM-DD'),
  })
  return {
    definition: 'origin_first_external_image_v1',
    definitionVersion: 1,
    generatedAt: dayjs().toISOString(),
    from: from.toISOString(),
    to: to.toISOString(),
    interpretation: 'daily_milestone_totals_not_a_cohort_conversion_rate',
    eligibilitySnapshot: 'current_classification_and_membership',
    population: 'retained_workspaces_and_projects_only',
    coverage:
      'prospective_origin_observations_only; null means unknown, not zero',
    ...readout,
  }
}

export function getRecentFirstValueFunnel() {
  const today = dayjs.utc().startOf('day')
  return getFirstValueFunnel({
    from: today.subtract(RECENT_FUNNEL_DAYS, 'day').toISOString(),
    to: today.toISOString(),
  })
}
