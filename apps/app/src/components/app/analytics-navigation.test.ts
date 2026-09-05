// @vitest-environment jsdom

import {
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, createElement, Fragment } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

vi.mock('@/env/client', () => ({
  clientEnv: { VITE_GTM_CONTAINER_ID: 'GTM-LOCALTEST' },
}))

import { AnalyticsConsent } from './analytics-consent'

it('measures the committed destination after a real TanStack route transition', async () => {
  Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  window.history.replaceState({}, '', '/')
  window.localStorage.setItem('keenpix.analytics-consent.v1', 'granted')
  window.dataLayer = []
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const rootRoute = createRootRoute({
    component: () =>
      createElement(
        Fragment,
        null,
        createElement(Outlet),
        createElement(AnalyticsConsent),
      ),
  })
  const index = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => createElement('h1', null, 'Landing'),
  })
  let release: () => void = () => {
    throw new Error('Loader not initialized')
  }
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  const signup = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    loader: () => pending,
    component: () => createElement('h1', null, 'Signup'),
  })
  const history = createBrowserHistory()
  const router = createRouter({
    routeTree: rootRoute.addChildren([index, signup]),
    history,
  })

  try {
    await act(async () => {
      root.render(createElement(RouterProvider, { router }))
      await router.load()
    })
    expect(
      window.dataLayer.filter(
        (event) => Reflect.get(event, '1') === 'page_view',
      ),
    ).toHaveLength(1)
    const navigation = router.navigate({ to: '/signup' })
    await act(async () => {
      await Promise.resolve()
    })
    expect(
      window.dataLayer.filter(
        (event) => Reflect.get(event, '1') === 'page_view',
      ),
    ).toHaveLength(1)
    await act(async () => {
      release()
      await navigation
    })
    const views = window.dataLayer.filter(
      (event) => Reflect.get(event, '1') === 'page_view',
    )
    expect(views).toHaveLength(2)
    expect(views[1] && Reflect.get(views[1], '2')).toMatchObject({
      page_path: '/signup',
      page_location: `${window.location.origin}/signup`,
      page_referrer: `${window.location.origin}/`,
      content_group: 'authentication',
      page_title: 'Keenpix',
    })
  } finally {
    await act(() => root.unmount())
    history.destroy()
    container.remove()
    vi.restoreAllMocks()
  }
})
