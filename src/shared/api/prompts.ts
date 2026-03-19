import { request } from '@/shared/api/http-client'
import type { PromptTemplate } from '@/shared/api/types'

type PromptListResponse = { prompts: PromptTemplate[] }

export type UpsertPromptInput = {
  system: string
  user: string
}

export function listPrompts(projectId: string): Promise<PromptTemplate[]> {
  return request<PromptListResponse>(`/projects/${projectId}/prompts`).then((r) => r.prompts)
}

export function upsertPrompt(
  projectId: string,
  capability: string,
  input: UpsertPromptInput,
): Promise<PromptTemplate> {
  return request<PromptTemplate>(`/projects/${projectId}/prompts/${capability}`, {
    method: 'PUT',
    body: input,
  })
}

export function deletePrompt(projectId: string, capability: string): Promise<void> {
  return request<void>(`/projects/${projectId}/prompts/${capability}`, {
    method: 'DELETE',
  })
}
