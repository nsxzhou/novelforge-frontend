import { request } from '@/shared/api/http-client'
import type { LLMProvider, LLMProviderTestResult, LLMTimeoutPolicy } from '@/shared/api/types'

type ProviderListResponse = { providers: LLMProvider[] }

export type AddProviderInput = {
  provider: string
  model: string
  base_url: string
  api_key: string
  timeout_seconds?: number
  priority?: number
  enabled?: boolean
}

export type UpdateProviderInput = Partial<AddProviderInput>

export function listProviders(): Promise<LLMProvider[]> {
  return request<ProviderListResponse>('/llm/providers').then((r) => r.providers)
}

export function getTimeoutPolicy(): Promise<LLMTimeoutPolicy> {
  return request<LLMTimeoutPolicy>('/llm/timeout-policy')
}

export function addProvider(input: AddProviderInput): Promise<LLMProvider> {
  return request<LLMProvider>('/llm/providers', {
    method: 'POST',
    body: input,
  })
}

export function updateProvider(id: string, input: UpdateProviderInput): Promise<LLMProvider> {
  return request<LLMProvider>(`/llm/providers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteProvider(id: string): Promise<void> {
  return request<void>(`/llm/providers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function testProvider(id: string, timeoutSeconds: number): Promise<LLMProviderTestResult> {
  const policy = await getTimeoutPolicy()
  return request<LLMProviderTestResult>(`/llm/providers/${encodeURIComponent(id)}/test`, {
    method: 'POST',
    timeout: (timeoutSeconds + policy.single_call_buffer_seconds) * 1000,
  })
}
