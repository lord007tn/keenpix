// @vitest-environment jsdom

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  useRouter: vi.fn(),
  createProject: vi.fn(),
  setProject: vi.fn(),
}))
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouter: mocks.useRouter,
  useRouteContext: () => ({ cloud: true }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { plan: 'basic' } }),
}))
vi.mock('@/functions/billing', () => ({ getBillingStateFn: vi.fn() }))
vi.mock('@/functions/projects', () => ({
  createProjectFn: mocks.createProject,
}))
vi.mock('@/lib/analytics/client', () => ({ trackFunnelMilestone: vi.fn() }))
vi.mock('@/stores/project-context', () => ({
  useProject: () => ({ setProject: mocks.setProject }),
}))

import { NewProjectDialog } from './new-project-dialog'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('new project dialog', () => {
  it('associates labels and help with its own fields over an existing project form', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () =>
        root.render(
          createElement(
            'div',
            null,
            createElement('input', {
              id: 'name',
              defaultValue: 'Existing project',
            }),
            createElement('input', {
              id: 'origin',
              defaultValue: 'https://old.example.com',
            }),
            createElement(NewProjectDialog, { open: true }),
          ),
        ),
      )
      const dialog = document.querySelector('[role="dialog"]')
      expect(dialog).not.toBeNull()
      for (const text of ['Name', 'Origin URL']) {
        const label = Array.from(dialog?.querySelectorAll('label') ?? []).find(
          (element) => element.textContent === text,
        )
        expect(label).toBeDefined()
        expect(dialog?.contains(label?.control ?? null)).toBe(true)
      }
      const origin = dialog?.querySelector<HTMLInputElement>(
        'input[name="origin"]',
      )
      const helpId = origin?.getAttribute('aria-describedby')
      expect(helpId).toBeTruthy()
      expect(document.getElementById(helpId ?? '')?.textContent).toContain(
        'automatically',
      )
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })

  it('waits for refreshed project loaders before selecting the created project', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const parentRoute = createRootRoute()
    let calls = 0
    let completeLoader: (() => void) | undefined
    const page = createRoute({
      getParentRoute: () => parentRoute,
      path: '/',
      loader: () =>
        ++calls === 1
          ? ['synthetic-a']
          : new Promise<string[]>((resolve) => {
              completeLoader = () => resolve(['synthetic-a', 'synthetic-b'])
            }),
    })
    const router = createRouter({
      routeTree: parentRoute.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    mocks.useRouter.mockReturnValue(router)
    mocks.createProject.mockResolvedValue({
      id: 'synthetic-b',
      name: 'Synthetic B',
    })
    const selectedSnapshots: unknown[] = []
    mocks.setProject.mockImplementation(() =>
      selectedSnapshots.push(router.state.matches.at(-1)?.loaderData),
    )
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      await act(async () =>
        root.render(createElement(NewProjectDialog, { open: true })),
      )
      for (const [name, value] of [
        ['name', 'Synthetic B'],
        ['origin', 'https://assets.example.com'],
      ]) {
        const input = document.querySelector<HTMLInputElement>(
          `[role="dialog"] input[name="${name}"]`,
        )
        if (!input) {
          throw new Error(`Missing ${name} input`)
        }
        await act(() => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )?.set?.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
      }
      await act(async () => {
        document
          .querySelector('[role="dialog"] form')
          ?.dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true }),
          )
        await vi.waitFor(() => expect(completeLoader).toBeDefined())
        completeLoader?.()
        await vi.waitFor(() =>
          expect(mocks.setProject).toHaveBeenCalledWith('synthetic-b'),
        )
      })
      expect(mocks.createProject).toHaveBeenCalledWith({
        data: { name: 'Synthetic B', origin: 'https://assets.example.com' },
      })
      expect(mocks.setProject).toHaveBeenCalledWith('synthetic-b')
      expect(selectedSnapshots).toEqual([['synthetic-a', 'synthetic-b']])
    } finally {
      await act(async () => root.unmount())
      container.remove()
    }
  })
})
