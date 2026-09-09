// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@/shared/types'

const mocks = vi.hoisted(() => ({
  project: {} as Project,
  allProjects: false,
  section: 'pipeline' as string | undefined,
  productAccess: true,
  setProject: vi.fn(),
  save: vi.fn().mockResolvedValue({}),
  invalidate: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useSearch: () => ({ section: mocks.section }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouteContext: () => ({
    cloud: true,
    orgRole: 'owner',
    productAccess: mocks.productAccess,
  }),
  useRouter: () => ({ invalidate: mocks.invalidate }),
}))
vi.mock('@/stores/project-context', () => ({
  useProject: () => ({
    currentProject: mocks.allProjects ? undefined : mocks.project,
    projects: [mocks.project],
    setProject: mocks.setProject,
  }),
}))
vi.mock('@/functions/projects', () => ({ updateProjectSettingsFn: mocks.save }))
vi.mock('@/shared/seo', () => ({ appPageHead: vi.fn() }))
vi.mock('@/features/api-keys/api-key-management', () => ({
  ApiKeyManagement: () => null,
}))
vi.mock('@/features/billing/billing-panel', () => ({
  BillingPanel: () => 'Synthetic billing panel',
}))
vi.mock('@/features/projects/allowed-hosts', () => ({
  AllowedHosts: () => null,
}))
vi.mock('@/features/projects/custom-domains', () => ({
  CustomDomains: () => null,
}))
vi.mock('@/features/projects/new-project-dialog', () => ({
  NewProjectDialog: () => null,
}))
vi.mock('@/features/projects/project-general', () => ({
  ProjectGeneral: () => null,
}))
vi.mock('@/features/projects/signed-urls', () => ({ SignedUrls: () => null }))
vi.mock('@/features/team/team-management', () => ({
  TeamManagement: () => null,
}))

import { Route } from '@/routes/app/settings'

const firstProject: Project = {
  id: 'synthetic-a',
  orgId: 'synthetic-org',
  name: 'Synthetic A',
  origin: 'https://assets.example.com',
  allowedOrigins: ['assets.example.com'],
  autoFormat: true,
  stripMetadata: true,
  color1: '#000000',
  color2: '#ffffff',
  createdAt: '2026-01-01T00:00:00Z',
  defaultDpr: 1,
  defaultFit: 'cover',
  defaultQuality: 80,
  maxWidth: 800,
  requireSignedUrls: false,
  signedUrlTtlSeconds: null,
  watermarkEnabled: true,
  watermarkMargin: 8,
  watermarkOpacity: 90,
  watermarkPosition: 'center',
  watermarkScale: 10,
  watermarkUrl: 'https://assets.example.com/a.png',
}
const secondProject: Project = {
  ...firstProject,
  id: 'synthetic-b',
  name: 'Synthetic B',
  autoFormat: false,
  stripMetadata: false,
  defaultDpr: 2,
  defaultFit: 'contain',
  defaultQuality: 60,
  maxWidth: 1200,
  watermarkEnabled: false,
  watermarkMargin: 20,
  watermarkOpacity: 40,
  watermarkPosition: 'south',
  watermarkScale: 25,
  watermarkUrl: 'https://assets.example.com/b.png',
}

afterEach(() => {
  vi.clearAllMocks()
  mocks.allProjects = false
  mocks.section = 'pipeline'
  mocks.productAccess = true
})

describe('project settings identity', () => {
  it('offers project selection from All projects, preserving explicit billing and setup entry', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    const root = createRoot(container)
    const Page = Route.options.component
    if (!Page) {
      throw new Error('Settings page component is missing')
    }
    mocks.project = firstProject
    mocks.allProjects = true
    mocks.section = undefined
    try {
      await act(() => root.render(createElement(Page)))
      expect(container.textContent).toContain('Select a project')
      expect(container.textContent).toContain('Synthetic A')
      expect(container.textContent).not.toContain('Synthetic billing panel')
      await act(() => container.querySelector('button')?.click())
      expect(mocks.setProject).toHaveBeenCalledWith(firstProject.id)
      mocks.section = 'billing'
      await act(() => root.render(createElement(Page)))
      expect(container.textContent).toContain('Synthetic billing panel')
      mocks.section = undefined
      mocks.productAccess = false
      await act(() => root.render(createElement(Page)))
      expect(container.textContent).toContain('Synthetic billing panel')
    } finally {
      await act(() => root.unmount())
      vi.unstubAllGlobals()
    }
  })
  it('blocks invalid widths inline and preserves zero-clear and upper-bound saves', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const Page = Route.options.component
    if (!Page) {
      throw new Error('Settings page component is missing')
    }
    try {
      mocks.project = firstProject
      await act(async () => root.render(createElement(Page)))
      const input = container.querySelector<HTMLInputElement>(
        '[aria-label="Max width"]',
      )
      const save = input?.parentElement?.querySelector('button')
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set
      if (!(input && save && setValue)) {
        throw new Error('Width controls are missing')
      }
      for (const [value, message] of [
        ['-1', 'Use 0 or a positive width.'],
        ['10001', 'Use 10000 or fewer.'],
        ['1.5', 'Use a whole number.'],
      ]) {
        await act(() => {
          setValue.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        expect(input.getAttribute('aria-invalid')).toBe('true')
        expect(input.getAttribute('aria-describedby')).toBe('max-width-error')
        expect(container.querySelector('#max-width-error')?.textContent).toBe(
          message,
        )
        expect(save.disabled).toBe(true)
        await act(async () => save.click())
        expect(mocks.save).not.toHaveBeenCalled()
      }
      for (const value of ['', '0', '10000']) {
        mocks.save.mockClear()
        await act(() => {
          setValue.call(input, value)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        expect(input.getAttribute('aria-invalid')).toBe('false')
        expect(input.hasAttribute('aria-describedby')).toBe(false)
        expect(container.querySelector('#max-width-error')).toBeNull()
        expect(save.disabled).toBe(false)
        await act(async () => save.click())
        expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
          data: { projectId: firstProject.id, maxWidth: Number(value) },
        })
      }
    } finally {
      await act(async () => root.unmount())
      container.remove()
      vi.unstubAllGlobals()
    }
  })

  it('loads the selected project values and saves only that project after switching', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const Page = Route.options.component
    if (!Page) {
      throw new Error('Settings page component is missing')
    }
    try {
      mocks.project = firstProject
      await act(async () => root.render(createElement(Page)))
      expect(
        container.querySelector<HTMLInputElement>('[aria-label="Max width"]')
          ?.value,
      ).toBe('800')
      expect(
        container.querySelector<HTMLInputElement>('#watermark-url')?.value,
      ).toBe(firstProject.watermarkUrl)

      mocks.project = secondProject
      await act(async () => root.render(createElement(Page)))
      expect(
        container.querySelector<HTMLInputElement>('[aria-label="Max width"]')
          ?.value,
      ).toBe('1200')
      expect(
        container.querySelector<HTMLInputElement>(
          '[aria-label="Default quality"]',
        )?.value,
      ).toBe('60')
      expect(
        container.querySelector<HTMLInputElement>('#watermark-url')?.value,
      ).toBe(secondProject.watermarkUrl)
      expect(
        container.querySelector<HTMLInputElement>('#watermark-opacity')?.value,
      ).toBe('40')
      const save = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === 'Save watermark',
      )
      expect(save).toBeDefined()
      await act(async () => save?.click())
      expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
        data: {
          projectId: secondProject.id,
          watermarkEnabled: false,
          watermarkMargin: 20,
          watermarkOpacity: 40,
          watermarkPosition: 'south',
          watermarkScale: 25,
          watermarkUrl: secondProject.watermarkUrl,
        },
      })
    } finally {
      await act(async () => root.unmount())
      container.remove()
      vi.unstubAllGlobals()
    }
  })
})
