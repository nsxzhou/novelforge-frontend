import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportErrorKind } from '@/shared/api/http-client'

const fetchMock = vi.fn()
const createRequestSignalMock = vi.fn((_timeout: number, signal?: AbortSignal) => signal ?? new AbortController().signal)
const getTransportErrorKindMock = vi.fn<(error: unknown) => TransportErrorKind>(() => 'unknown')

vi.mock('@/shared/api/http-client', () => ({
  createRequestSignal: (...args: Parameters<typeof createRequestSignalMock>) => createRequestSignalMock(...args),
  getTransportErrorKind: (...args: Parameters<typeof getTransportErrorKindMock>) => getTransportErrorKindMock(...args),
}))

vi.mock('@/shared/api/client-identity', () => ({
  getClientUserId: () => 'test-user',
}))

import { streamRequest } from '@/shared/api/sse-client'

describe('sse-client', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    createRequestSignalMock.mockClear()
    getTransportErrorKindMock.mockReset()
    getTransportErrorKindMock.mockReturnValue('unknown')
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes JSON error bodies from non-2xx responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '{"error":"service: dependency unavailable: llm client is not configured"}',
    })

    const error = await new Promise<string>((resolve, reject) => {
      streamRequest(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent: vi.fn(),
          onDone: () => reject(new Error('expected non-2xx response to fail')),
          onError: resolve,
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(error).toBe('AI Provider 未配置，请先在模型设置中启用可用 Provider。')
  })

  it('normalizes stage-prefixed JSON error bodies from non-2xx responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => '{"error":"service: dependency unavailable: prompt rendering: prompt template chapter_generation not found"}',
    })

    const error = await new Promise<string>((resolve, reject) => {
      streamRequest(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent: vi.fn(),
          onDone: () => reject(new Error('expected non-2xx response to fail')),
          onError: resolve,
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(error).toBe('章节提示词配置不可用，请检查提示词模板配置。')
  })

  it('preserves plain text error bodies from non-2xx responses', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request',
    })

    const error = await new Promise<string>((resolve, reject) => {
      streamRequest(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent: vi.fn(),
          onDone: () => reject(new Error('expected non-2xx response to fail')),
          onError: resolve,
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(error).toBe('bad request')
  })

  it.each([
    ['timeout', 'AI 请求超时，请增大 Provider 超时时间后重试。'],
    ['cancelled', '请求已取消。'],
    ['disconnected', 'AI 连接已中断，请重试。'],
  ] as const)('normalizes %s transport errors', async (kind, message) => {
    getTransportErrorKindMock.mockReturnValue(kind)
    fetchMock.mockRejectedValue(new Error(`${kind} failure`))

    const error = await new Promise<string>((resolve, reject) => {
      streamRequest(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent: vi.fn(),
          onDone: () => reject(new Error('expected request to fail')),
          onError: resolve,
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(error).toBe(message)
  })

  it('normalizes streamed error event messages', async () => {
    const encoder = new TextEncoder()
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('event: error\ndata: service: dependency unavailable: prompt template chapter_generation not found\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => reader,
      },
    })

    const error = await new Promise<string>((resolve, reject) => {
      streamRequest(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent: vi.fn(),
          onDone: () => reject(new Error('expected streamed error event to fail')),
          onError: resolve,
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(error).toBe('章节提示词配置不可用，请检查提示词模板配置。')
  })

  it('continues to parse streamed content and done events', async () => {
    const encoder = new TextEncoder()
    const reader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('event: content\ndata: hello\n\n'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('event: done\ndata: {"message":"world"}\n\n'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
    }

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        getReader: () => reader,
      },
    })

    const onContent = vi.fn()
    const result = await new Promise<{ message: string }>((resolve, reject) => {
      streamRequest<{ message: string }>(
        '/chapters/stream',
        { prompt: 'hello' },
        {
          onContent,
          onDone: resolve,
          onError: (error) => reject(new Error(error)),
        },
        undefined,
        { timeoutMs: 1 },
      )
    })

    expect(onContent).toHaveBeenCalledWith('hello')
    expect(result).toEqual({ message: 'world' })
  })
})
