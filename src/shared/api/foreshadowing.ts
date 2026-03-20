import { request } from '@/shared/api/http-client'
import type { Foreshadowing } from '@/shared/api/types'

type ForeshadowingListResponse = { foreshadowings: Foreshadowing[] }

export type CreateForeshadowingInput = {
  chapter_planted_id: string
  chapter_expected_resolve_id?: string
  title: string
  description?: string
  status?: string
}

export type UpdateForeshadowingInput = {
  chapter_planted_id?: string
  chapter_expected_resolve_id?: string
  chapter_actual_resolve_id?: string
  title?: string
  description?: string
  status?: string
}

export function listForeshadowings(projectId: string): Promise<Foreshadowing[]> {
  return request<ForeshadowingListResponse>(
    `/projects/${projectId}/foreshadowings`,
  ).then((r) => r.foreshadowings)
}

export function createForeshadowing(projectId: string, input: CreateForeshadowingInput): Promise<Foreshadowing> {
  return request<Foreshadowing>(`/projects/${projectId}/foreshadowings`, {
    method: 'POST',
    body: input,
  })
}

export function updateForeshadowing(projectId: string, id: string, input: UpdateForeshadowingInput): Promise<Foreshadowing> {
  return request<Foreshadowing>(`/projects/${projectId}/foreshadowings/${id}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteForeshadowing(projectId: string, id: string): Promise<void> {
  return request<void>(`/projects/${projectId}/foreshadowings/${id}`, {
    method: 'DELETE',
  })
}
