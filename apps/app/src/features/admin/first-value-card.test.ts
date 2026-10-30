import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/functions/admin', () => ({ getFirstValueFunnelFn: vi.fn() }))

import { FirstValueFunnelSummary } from './first-value-card'

const MEASURED_ZERO = />0</
const MEASURED_TWO = />2</
const UNKNOWN_TOTAL = /tabular-nums">Unknown</g
const CUSTOMER_LABEL = /activated customer/i

const funnel = {
  definition: 'origin_first_external_image_v1',
  definitionVersion: 1,
  generatedAt: '2026-10-03T00:00:00.000Z',
  from: '2026-10-01T00:00:00.000Z',
  to: '2026-10-03T00:00:00.000Z',
  interpretation: 'daily_milestone_totals_not_a_cohort_conversion_rate',
  eligibilitySnapshot: 'current_classification_and_membership',
  population: 'retained_workspaces_and_projects_only',
  coverage: 'prospective_origin_observations_only',
  coverageStartedAt: '2026-10-01T09:30:00.000Z' as string | null,
  pendingCandidateEvents: 0,
  observedWorkspaces: 0,
  days: [
    {
      day: '2026-10-01',
      signups: 2,
      firstProjectWorkspaces: 1,
      firstExternalImageWorkspaces: null as number | null,
      preexistingFirstExternalImageWorkspaces: null as number | null,
    },
    {
      day: '2026-10-02',
      signups: 0,
      firstProjectWorkspaces: 0,
      firstExternalImageWorkspaces: 0 as number | null,
      preexistingFirstExternalImageWorkspaces: 0 as number | null,
    },
  ],
}

function render(value: typeof funnel | null) {
  return renderToStaticMarkup(
    createElement(FirstValueFunnelSummary, { funnel: value }),
  )
}

describe('first value card', () => {
  it('labels the milestone and keeps it distinct from a customer activation', () => {
    const html = render(funnel)
    expect(html).toContain('First eligible external image')
    expect(html).toContain('not a cohort')
    expect(html).not.toMatch(CUSTOMER_LABEL)
  })

  it('shows Unknown for an uncovered day and 0 for a measured empty day', () => {
    const [newest, oldest] = render(funnel)
      .split('<tbody')[1]
      ?.split('</tr>') ?? ['', '']
    expect(newest).toContain('2026-10-02')
    expect(newest).not.toContain('Unknown')
    expect(newest).toMatch(MEASURED_ZERO)
    expect(oldest).toContain('2026-10-01')
    expect(oldest).toContain('Unknown')
    expect(oldest).toMatch(MEASURED_TWO)
  })

  it('reports a covered total of zero as 0, not Unknown', () => {
    const html = render(funnel)
    expect(html).toContain('Covered days only: 1 of 2 days')
    expect(html).toContain(
      '<span class="font-semibold text-2xl tabular-nums">0</span>',
    )
  })

  it('shows Unknown rather than zero when coverage never started', () => {
    const html = render({
      ...funnel,
      coverageStartedAt: null,
      days: funnel.days.map((day) => ({
        ...day,
        firstExternalImageWorkspaces: null,
        preexistingFirstExternalImageWorkspaces: null,
      })),
    })
    expect(html).toContain('Covered days only: 0 of 2 days')
    expect(html).toContain('Coverage has not started')
    expect(html).toContain(
      '<span class="font-semibold text-2xl tabular-nums">Unknown</span>',
    )
  })

  it('shows Unknown for every total when the data is unavailable', () => {
    const html = render(null)
    expect(html).toContain('First value data is unavailable')
    expect(html.match(UNKNOWN_TOTAL)).toHaveLength(3)
    expect(html).not.toContain('Coverage has not started')
  })
})

it('does not claim a verified midnight start day is Unknown', () => {
  const html = render({
    ...funnel,
    coverageStartedAt: '2026-10-01T00:00:00.000Z',
  })
  expect(html).toContain(
    'Only verified, uninterrupted whole days are measured.',
  )
  expect(html).not.toContain('earlier days and that day are Unknown')
})
