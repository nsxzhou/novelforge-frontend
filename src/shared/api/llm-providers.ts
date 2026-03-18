import { request } from '@/shared/api/http-client'
import type { LLMProvider, LLMProviderTestResult } from '@/shared/api/types'

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

export function addProvider(input: AddProviderInput): Promise<LLMProvider> {
  return request<LLMProvider>('/llm/providers', {
    method: 'POST',
    body: input,
  })
}

export function updateProvider(id: string, input: UpdateProviderInput): Promise<LLMProvider> {
  return request<LLMProvider>(`/llm/providers/${id}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteProvider(id: string): Promise<void> {
  return request<void>(`/llm/providers/${id}`, {
    method: 'DELETE',
  })
}

export function testProvider(id: string): Promise<LLMProviderTestResult> {
  return request<LLMProviderTestResult>(`/llm/providers/${id}/test`, {
    method: 'POST',
  })
}
