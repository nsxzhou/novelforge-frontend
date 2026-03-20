import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTimeoutPolicy, testProvider } from '@/shared/api/llm-providers'

const fetchMock = vi.fn()
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
}
const abortSignalTimeoutMock = vi.fn((ms: number) => ({ timeoutMs: ms } as unknown as AbortSignal))

describe('llm-providers timeout policy', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    abortSignalTimeoutMock.mockClear()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('window', { localStorage: localStorageMock } as unknown as Window & typeof globalThis)
    vi.stubGlobal('AbortSignal', {
      ...AbortSignal,
      timeout: abortSignalTimeoutMock,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches timeout policy on each call', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        base_provider_timeout_seconds: 45,
        single_call_buffer_seconds: 60,
        brainstorm_stage_count: 3,
        brainstorm_buffer_seconds: 120,
        single_call_timeout_seconds: 105,
        brainstorm_timeout_seconds: 255,
        server_write_timeout_seconds: 7200,
      }),
    })

    const first = await getTimeoutPolicy()
    const second = await getTimeoutPolicy()

    expect(first.single_call_timeout_seconds).toBe(105)
    expect(second.single_call_timeout_seconds).toBe(105)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses provider timeout plus buffer when testing provider', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          base_provider_timeout_seconds: 45,
          single_call_buffer_seconds: 60,
          brainstorm_stage_count: 3,
          brainstorm_buffer_seconds: 120,
          single_call_timeout_seconds: 105,
          brainstorm_timeout_seconds: 255,
          server_write_timeout_seconds: 7200,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          provider_id: 'provider-1',
          success: true,
          latency_ms: 123,
          message: 'Provider 测试成功',
        }),
      })

    const result = await testProvider('provider-1', 90)

    expect(result.provider_id).toBe('provider-1')
    expect(abortSignalTimeoutMock).toHaveBeenCalledWith(150_000)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://127.0.0.1:8080/api/v1/llm/providers/provider-1/test',
      expect.objectContaining({
        method: 'POST',
        signal: expect.objectContaining({ timeoutMs: 150_000 }),
      }),
    )
  })
})
