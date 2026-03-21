import { createRequestSignal, getTransportErrorKind } from '@/shared/api/http-client'
import { getClientUserId } from '@/shared/api/client-identity'
import { getTimeoutPolicy } from '@/shared/api/llm-providers'
import { appEnv } from '@/shared/config/env'
import { normalizeServiceErrorMessage } from '@/shared/lib/error-message'
import type { ZodType } from 'zod'

export type SSECallbacks<T> = {
  onContent: (chunk: string) => void
  onDone: (result: T) => void
  onError: (error: string) => void
}

type StreamRequestOptions<T> = {
  contentEventName?: string
  doneEventName?: string
  errorEventName?: string
  timeoutMs?: number
  timeoutMode?: 'single' | 'brainstorm'
  onEvent?: (eventType: string, rawData: string) => void
  parseDone?: (rawData: string) => T
}

type StreamRequestWithSchemaOptions<T> = Omit<StreamRequestOptions<T>, 'parseDone'>

export function parseJsonWithSchema<T>(
  rawData: string,
  schema: ZodType<T>,
  label: string,
): T {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawData) as unknown
  } catch {
    throw new Error(`${label} is not valid JSON`)
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`${label} failed schema validation`)
  }
  return result.data
}

export function streamRequest<T>(
  path: string,
  body: unknown,
  callbacks: SSECallbacks<T>,
  signal?: AbortSignal,
  options: StreamRequestOptions<T> = {},
): void {
  const url = `${appEnv.apiBaseUrl}${path}`
  resolveTimeoutMs(options)
    .then((timeoutMs) => {
      const requestSignal = createRequestSignal(timeoutMs, signal)

      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getClientUserId(),
        },
        body: JSON.stringify(body),
        signal: requestSignal,
      })
    })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => `HTTP ${response.status}`)
        callbacks.onError(parseErrorMessage(text))
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        callbacks.onError('Response body is not readable')
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            options.onEvent?.(currentEvent, data)
            if (currentEvent === (options.contentEventName ?? 'content')) {
              callbacks.onContent(data)
            } else if (currentEvent === (options.doneEventName ?? 'done')) {
              try {
                const parsed = options.parseDone ? options.parseDone(data) : JSON.parse(data) as T
                callbacks.onDone(parsed)
              } catch {
                callbacks.onError('Failed to parse done event data')
              }
            } else if (currentEvent === (options.errorEventName ?? 'error')) {
              callbacks.onError(parseErrorMessage(data))
            }
            currentEvent = ''
          }
        }
      }
    })
    .catch((err: unknown) => {
      if (signal?.aborted) return
      callbacks.onError(normalizeStreamError(err))
    })
}

export function streamRequestWithSchema<T>(
  path: string,
  body: unknown,
  callbacks: SSECallbacks<T>,
  schema: ZodType<T>,
  label: string,
  signal?: AbortSignal,
  options: StreamRequestWithSchemaOptions<T> = {},
): void {
  streamRequest(path, body, callbacks, signal, {
    ...options,
    parseDone: (rawData) => parseJsonWithSchema(rawData, schema, label),
  })
}

function parseErrorMessage(rawData: string): string {
  let message = rawData

  try {
    const parsed = JSON.parse(rawData) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error.trim() !== '') {
      message = parsed.error
    }
  } catch {
    // ignore invalid json
  }

  return normalizeServiceErrorMessage(message)
}

async function resolveTimeoutMs<T>(options: StreamRequestOptions<T>): Promise<number> {
  if (options.timeoutMs !== undefined) {
    return options.timeoutMs
  }
  const policy = await getTimeoutPolicy()
  const timeoutSeconds = options.timeoutMode === 'brainstorm'
    ? policy.brainstorm_timeout_seconds
    : policy.single_call_timeout_seconds
  return timeoutSeconds * 1000
}

function normalizeStreamError(error: unknown): string {
  const kind = getTransportErrorKind(error)
  if (kind === 'timeout') {
    return 'AI 请求超时，请增大 Provider 超时时间后重试。'
  }
  if (kind === 'cancelled') {
    return '请求已取消。'
  }
  if (kind === 'disconnected') {
    return 'AI 连接已中断，请重试。'
  }
  if (error instanceof Error) {
    return normalizeServiceErrorMessage(error.message) || error.message
  }
  return 'Stream request failed'
}
