// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

vi.mock('@/functions/admin', () => ({
  getPlatformAnalyticsFn: vi
    .fn()
    .mockRejectedValue(new Error('Synthetic analytics outage')),
  getFinanceDashboardFn: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/functions/analytics', () => ({
  getEdgeCacheStatsFn: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/features/admin/first-value-card', () => ({
  FirstValueCard: () =>
    createElement(
      'aside',
      { 'data-testid': 'first-value' },
      'Independent first value',
    ),
}))
vi.mock('@/components/app/history-range-picker', () => ({
  HistoryRangePicker: () => null,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

import { PlatformAnalyticsView } from './platform-analytics-view'

it('keeps first-value reporting visible after the platform analytics request fails', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(createElement(PlatformAnalyticsView))
      await Promise.resolve()
    })
    expect(container.textContent).toContain('load platform analytics.')
    expect(container.textContent).toContain('Try again')
    expect(
      container.querySelector('[data-testid="first-value"]'),
    ).not.toBeNull()
  } finally {
    act(() => {
      root.unmount()
    })
    vi.unstubAllGlobals()
  }
})
