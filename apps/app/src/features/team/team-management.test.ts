// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  inviteMember: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  refetch: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { error: mocks.error, success: mocks.success },
}))
vi.mock('@/lib/auth/client', () => ({
  authClient: { organization: { inviteMember: mocks.inviteMember } },
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data:
      queryKey[0] === 'org-full'
        ? { name: 'Synthetic workspace', members: [], invitations: [] }
        : { id: 'synthetic-owner', role: 'owner' },
    refetch: mocks.refetch,
  }),
}))

import { TeamManagement } from './team-management'

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})
it.each([
  {
    label: 'successful invitation',
    result: { data: { id: 'synthetic-invitation' }, error: null },
    message: 'Invitation sent to member@example.test',
  },
  {
    label: 'empty failure response',
    result: { data: null, error: null },
    message: 'Could not send invitation. Please try again.',
  },
  {
    label: 'structured plan denial',
    result: {
      data: null,
      error: { message: 'An active subscription is required.' },
    },
    message: 'An active subscription is required.',
  },
])('handles $label without misreporting success', async ({
  result,
  message,
}) => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  mocks.inviteMember.mockResolvedValue(result)
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(() => {
      root.render(createElement(TeamManagement))
    })
    const input = container.querySelector('input[type="email"]')
    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Invitation input missing')
    }
    await act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, 'member@example.test')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = input.closest('form')
    if (!form) {
      throw new Error('Invitation form missing')
    }
    await act(() => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      )
    })
    expect(mocks.inviteMember).toHaveBeenCalledWith({
      email: 'member@example.test',
      role: 'member',
    })
    if (result.data?.id) {
      expect(mocks.error).not.toHaveBeenCalled()
      expect(mocks.success).toHaveBeenCalledWith(message)
      expect(mocks.refetch).toHaveBeenCalledOnce()
      expect(input.value).toBe('')
    } else {
      expect(mocks.error).toHaveBeenCalledWith(message)
      expect(mocks.success).not.toHaveBeenCalled()
      expect(mocks.refetch).not.toHaveBeenCalled()
      expect(input.value).toBe('member@example.test')
    }
  } finally {
    await act(() => {
      root.unmount()
    })
    container.remove()
  }
})
