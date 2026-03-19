import { getClientUserId } from '@/shared/api/client-identity'
import { appEnv } from '@/shared/config/env'
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
  const timeoutMs = options.timeoutMs ?? 300_000
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getClientUserId(),
    },
    body: JSON.stringify(body),
    signal: requestSignal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text().catch(() => `HTTP ${response.status}`)
        callbacks.onError(text)
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
      callbacks.onError(err instanceof Error ? err.message : 'Stream request failed')
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
  try {
    const parsed = JSON.parse(rawData) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error.trim() !== '') {
      return parsed.error
    }
  } catch {
    // ignore invalid json
  }
  return rawData
}
