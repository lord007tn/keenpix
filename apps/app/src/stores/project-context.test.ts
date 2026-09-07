// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import type { Project } from '@/shared/types'
import { ProjectProvider, useProject } from './project-context'

const projects = ['a', 'b'].map(
  (id) =>
    ({
      id,
      name: id,
      orgId: 'fixture',
      origin: 'https://example.com',
      allowedOrigins: [],
      autoFormat: true,
      color1: '',
      color2: '',
      createdAt: '2026-09-07T00:00:00Z',
      defaultDpr: 1,
      defaultFit: 'cover',
      defaultQuality: 80,
      maxWidth: null,
      requireSignedUrls: false,
      signedUrlTtlSeconds: null,
      stripMetadata: true,
      watermarkEnabled: false,
      watermarkMargin: 0,
      watermarkOpacity: 0,
      watermarkPosition: 'southeast',
      watermarkScale: 0,
      watermarkUrl: null,
    }) satisfies Project,
)

for (const [initial, next] of [
  ['a', 'b'],
  ['a', undefined],
  [undefined, 'a'],
]) {
  it(`keeps the rendered scope aligned during navigation from ${initial ?? 'all'} to ${next ?? 'all'}`, async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    let release: () => void = () => undefined
    let blockedProject = next
    let pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const container = document.createElement('div')
    const root = createRoot(container)
    const parent = createRootRoute({
      component: () =>
        createElement(ProjectProvider, {
          projects,
          // biome-ignore lint/correctness/noChildrenProp: The typed createElement boundary requires this component's children prop.
          children: createElement(Outlet),
        }),
    })
    const page = createRoute({
      getParentRoute: () => parent,
      path: '/',
      validateSearch: (search: Record<string, unknown>) => ({
        project:
          typeof search.project === 'string' ? search.project : undefined,
      }),
      loaderDeps: ({ search }) => search,
      beforeLoad: ({ search }) =>
        search.project === blockedProject ? pending : undefined,
      component: () => {
        const search = page.useSearch()
        const scope = useProject()
        return createElement(
          'div',
          null,
          createElement('h1', null, scope.currentProject?.name ?? 'all'),
          createElement(
            'output',
            null,
            'project' in search && typeof search.project === 'string'
              ? search.project
              : 'all',
          ),
          createElement(
            'button',
            { type: 'button', onClick: () => scope.setProject(next ?? null) },
            'Switch',
          ),
        )
      },
    })
    const history = createMemoryHistory({
      initialEntries: [initial ? `/?project=${initial}` : '/'],
    })
    const router = createRouter({
      routeTree: parent.addChildren([page]),
      history,
      defaultPendingMs: 10_000,
    })
    try {
      await act(async () => {
        root.render(createElement(RouterProvider, { router }))
        await router.load()
      })
      expect(container.querySelector('h1')?.textContent).toBe(initial ?? 'all')
      await act(async () => container.querySelector('button')?.click())
      expect(router.state.location.search.project).toBe(next)
      expect(container.querySelector('output')?.textContent).toBe(
        initial ?? 'all',
      )
      expect(container.querySelector('h1')?.textContent).toBe(initial ?? 'all')
      await act(async () => release())
      await vi.waitFor(async () => {
        await act(async () => undefined)
        expect(container.querySelector('output')?.textContent).toBe(
          next ?? 'all',
        )
        expect(container.querySelector('h1')?.textContent).toBe(next ?? 'all')
      })
      for (const [destination, previous, direction] of [
        [initial, next, 'back'],
        [next, initial, 'forward'],
      ] as const) {
        blockedProject = destination
        pending = new Promise<void>((resolve) => {
          release = resolve
        })
        await act(async () => history[direction]())
        await vi.waitFor(() =>
          expect(router.state.location.search.project).toBe(destination),
        )
        expect(container.querySelector('output')?.textContent).toBe(
          previous ?? 'all',
        )
        expect(container.querySelector('h1')?.textContent).toBe(
          previous ?? 'all',
        )
        await act(async () => release())
        await vi.waitFor(async () => {
          await act(async () => undefined)
          expect(container.querySelector('output')?.textContent).toBe(
            destination ?? 'all',
          )
          expect(container.querySelector('h1')?.textContent).toBe(
            destination ?? 'all',
          )
        })
      }
    } finally {
      await act(async () => root.unmount())
      history.destroy()
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
    }
  })
}
