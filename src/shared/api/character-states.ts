import { request } from '@/shared/api/http-client'
import type { CharacterRelation, CharacterState, RelationTypeConfig } from '@/shared/api/types'

type CharacterStateListResponse = { character_states: CharacterState[] }
type RelationTypesResponse = { relation_types: RelationTypeConfig[] }

export type UpdateCharacterStateInput = {
  character_name: string
  location: string
  emotional_state: string
  relationships: CharacterRelation[]
  notes: string
}

export function listLatestCharacterStates(projectId: string): Promise<CharacterState[]> {
  return request<CharacterStateListResponse>(
    `/projects/${projectId}/character-states/latest`,
  ).then((response) => response.character_states)
}

export function listChapterCharacterStates(
  projectId: string,
  chapterId: string,
): Promise<CharacterState[]> {
  return request<CharacterStateListResponse>(
    `/projects/${projectId}/chapters/${chapterId}/character-states`,
  ).then((response) => response.character_states)
}

export function updateCharacterState(
  projectId: string,
  stateId: string,
  input: UpdateCharacterStateInput,
): Promise<CharacterState> {
  return request<CharacterState>(`/projects/${projectId}/character-states/${stateId}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteCharacterState(projectId: string, stateId: string): Promise<void> {
  return request<void>(`/projects/${projectId}/character-states/${stateId}`, {
    method: 'DELETE',
  })
}

export function listRelationTypes(): Promise<RelationTypeConfig[]> {
  return request<RelationTypesResponse>('/relation-types').then((response) => response.relation_types)
}
