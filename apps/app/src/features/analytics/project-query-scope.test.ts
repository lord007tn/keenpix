// @vitest-environment jsdom
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalyticsQuery } from './use-analytics-query'
import { useDashboardQuery } from './use-dashboard-query'

const mocks = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/functions/analytics', () => ({ getAnalyticsFn: mocks.read }))
vi.mock('@/functions/dashboard', () => ({ getDashboardFn: mocks.read }))

beforeEach(() => notifyManager.setScheduler(queueMicrotask))

afterEach(() => {
  notifyManager.setScheduler((callback) => setTimeout(callback, 0))
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

for (const [name, useRead] of [
  ['overview', useDashboardQuery],
  ['analytics', useAnalyticsQuery],
] as const) {
  describe(`${name} project scope`, () => {
    for (const [previousProject, nextProject] of [
      ['project-a', 'project-b'],
      ['project-a', undefined],
      [undefined, 'project-a'],
    ]) {
      it(`hides the old payload while switching ${previousProject ?? 'all projects'} to ${nextProject ?? 'all projects'}`, async () => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
        const client = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
        const container = document.createElement('div')
        const root = createRoot(container)
        mocks.read.mockResolvedValue({ marker: 'previous-project-metrics' })

        function View({ project }: { project?: string }) {
          const query = useRead({ project, range: '24h' })
          return createElement(
            'output',
            null,
            query.isPending ? 'Loading project' : JSON.stringify(query.data),
          )
        }

        try {
          await act(async () =>
            root.render(
              createElement(
                QueryClientProvider,
                { client },
                createElement(View, { project: previousProject }),
              ),
            ),
          )
          await vi.waitFor(async () => {
            await act(async () => undefined)
            expect(container.textContent).toContain('previous-project-metrics')
          })
          mocks.read.mockImplementation(() => new Promise(() => undefined))
          await act(async () =>
            root.render(
              createElement(
                QueryClientProvider,
                { client },
                createElement(View, { project: nextProject }),
              ),
            ),
          )
          expect(container.textContent).toBe('Loading project')
          expect(container.textContent).not.toContain(
            'previous-project-metrics',
          )
        } finally {
          await act(async () => root.unmount())
          client.clear()
        }
      })
    }

    it('keeps the current project visible while its date range refreshes', async () => {
      vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })
      const container = document.createElement('div')
      const root = createRoot(container)
      mocks.read.mockResolvedValue({ marker: 'same-project-metrics' })

      function View({ range }: { range: '24h' | '7d' }) {
        const query = useRead({ project: 'project-a', range })
        return createElement(
          'output',
          null,
          query.isPending ? 'Loading project' : JSON.stringify(query.data),
        )
      }

      try {
        await act(async () =>
          root.render(
            createElement(
              QueryClientProvider,
              { client },
              createElement(View, { range: '24h' }),
            ),
          ),
        )
        await vi.waitFor(async () => {
          await act(async () => undefined)
          expect(container.textContent).toContain('same-project-metrics')
        })
        mocks.read.mockImplementation(() => new Promise(() => undefined))
        await act(async () =>
          root.render(
            createElement(
              QueryClientProvider,
              { client },
              createElement(View, { range: '7d' }),
            ),
          ),
        )
        expect(container.textContent).toContain('same-project-metrics')
      } finally {
        await act(async () => root.unmount())
        client.clear()
      }
    })
  })
}
