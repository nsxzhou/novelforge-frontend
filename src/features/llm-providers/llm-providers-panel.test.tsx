import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LLMProvidersPanel } from './llm-providers-panel'
import { ToastProvider } from '@/shared/ui/toast'

const listProvidersMock = vi.fn()
const addProviderMock = vi.fn()
const updateProviderMock = vi.fn()
const deleteProviderMock = vi.fn()
const testProviderMock = vi.fn()

vi.mock('@/shared/api/llm-providers', () => ({
  listProviders: () => listProvidersMock(),
  addProvider: (...args: unknown[]) => addProviderMock(...args),
  updateProvider: (...args: unknown[]) => updateProviderMock(...args),
  deleteProvider: (...args: unknown[]) => deleteProviderMock(...args),
  testProvider: (...args: unknown[]) => testProviderMock(...args),
}))

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <LLMProvidersPanel />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('LLMProvidersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listProvidersMock.mockResolvedValue([
      {
        id: 'provider-1',
        provider: 'openai_compatible',
        model: 'gpt-4o-mini',
        base_url: 'https://api.example.com/v1',
        api_key_masked: 'sk-...6789',
        timeout_seconds: 30,
        priority: 0,
        enabled: true,
      },
      {
        id: 'provider-2',
        provider: 'openai_compatible',
        model: 'gpt-4.1-mini',
        base_url: 'https://api.example.com/v1',
        api_key_masked: 'sk-...6789',
        timeout_seconds: 45,
        priority: 1,
        enabled: false,
      },
    ])
  })

  it('shows success result inside the provider card after testing', async () => {
    testProviderMock.mockResolvedValue({
      provider_id: 'provider-1',
      success: true,
      latency_ms: 123,
      message: 'Provider 测试成功',
    })

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('gpt-4o-mini')
    await user.click(screen.getAllByRole('button', { name: '测试' })[0])

    await waitFor(() => {
      expect(testProviderMock).toHaveBeenCalledWith('provider-1', 30)
    })

    expect((await screen.findAllByText('Provider 测试成功')).length).toBeGreaterThan(0)
    expect(screen.getByText('耗时 123 ms')).toBeTruthy()
  })

  it('shows failure result inside the provider card after testing', async () => {
    testProviderMock.mockRejectedValue(new Error('provider test failed: 401 unauthorized'))

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('gpt-4o-mini')
    await user.click(screen.getAllByRole('button', { name: '测试' })[0])

    await waitFor(() => {
      expect(testProviderMock).toHaveBeenCalledWith('provider-1', 30)
    })

    expect((await screen.findAllByText('provider test failed: 401 unauthorized')).length).toBeGreaterThan(0)
  })

  it('keeps disabled providers testable', async () => {
    renderPanel()

    await screen.findByText('gpt-4.1-mini')
    expect(screen.getByText('当前 Provider 已禁用，但仍可单独执行测试。')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: '测试' })).toHaveLength(2)
  })
})
