import { getClientUserId } from '@/shared/api/client-identity'
import { appEnv } from '@/shared/config/env'

export type SSECallbacks<T> = {
  onContent: (chunk: string) => void
  onDone: (result: T) => void
  onError: (error: string) => void
}

export function streamRequest<T>(
  path: string,
  body: unknown,
  callbacks: SSECallbacks<T>,
  signal?: AbortSignal,
): void {
  const url = `${appEnv.apiBaseUrl}${path}`

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': getClientUserId(),
    },
    body: JSON.stringify(body),
    signal,
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
            if (currentEvent === 'content') {
              callbacks.onContent(data)
            } else if (currentEvent === 'done') {
              try {
                callbacks.onDone(JSON.parse(data) as T)
              } catch {
                callbacks.onError('Failed to parse done event data')
              }
            } else if (currentEvent === 'error') {
              callbacks.onError(data)
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
