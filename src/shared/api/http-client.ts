import { getClientUserId } from '@/shared/api/client-identity'
import { appEnv } from '@/shared/config/env'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type ApiError = {
  status: number
  message: string
}

export class HttpError extends Error {
  status: number

  constructor({ status, message }: ApiError) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }
}

type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
  /** Request timeout in milliseconds. Defaults to 30000 (30s). */
  timeout?: number
}

export type TransportErrorKind = 'timeout' | 'cancelled' | 'disconnected' | 'unknown'

export function createRequestSignal(timeout: number, signal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeout)
  return signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal
}

export function getTransportErrorKind(error: unknown): TransportErrorKind {
  if (!(error instanceof Error)) {
    return 'unknown'
  }
  if (error.name === 'TimeoutError') {
    return 'timeout'
  }
  if (error.name === 'AbortError' && /This operation was aborted/i.test(error.message)) {
    return 'cancelled'
  }
  if (error.name === 'AbortError' || /BodyStreamBuffer was aborted/i.test(error.message)) {
    return 'disconnected'
  }
  return 'unknown'
}

function normalizeRequestError(error: unknown): Error {
  const kind = getTransportErrorKind(error)
  if (kind === 'timeout') {
    return new Error('AI 请求超时，请增大 Provider 超时时间后重试。')
  }
  if (kind === 'disconnected') {
    return new Error('AI 连接已中断，请重试。')
  }
  if (error instanceof Error) {
    return error
  }
  return new Error('请求失败，请稍后重试。')
}

async function fetchWithDefaults(path: string, options: RequestOptions = {}): Promise<Response> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  }

  if (options.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (method !== 'GET' && !headers['X-User-ID']) {
    headers['X-User-ID'] = getClientUserId()
  }

  const timeout = options.timeout ?? 30_000
  const signal = createRequestSignal(timeout, options.signal)

  return fetch(`${appEnv.apiBaseUrl}${path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal,
  })
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) {
    return null
  }

  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

function toHttpError(response: Response, payload: unknown): HttpError {
  const fallback = `HTTP ${response.status}`
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const message = String((payload as Record<string, unknown>).error || fallback)
    return new HttpError({ status: response.status, message })
  }
  return new HttpError({ status: response.status, message: fallback })
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetchWithDefaults(path, options)
  } catch (error) {
    throw normalizeRequestError(error)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await parseJsonSafe(response)

  if (!response.ok) {
    throw toHttpError(response, payload)
  }

  return payload as T
}

export async function requestRaw(path: string, options: RequestOptions = {}): Promise<Response> {
  let response: Response
  try {
    response = await fetchWithDefaults(path, options)
  } catch (error) {
    throw normalizeRequestError(error)
  }
  if (!response.ok) {
    const payload = await parseJsonSafe(response)
    throw toHttpError(response, payload)
  }
  return response
}
