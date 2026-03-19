import { request } from '@/shared/api/http-client'
import { parseJsonWithSchema, streamRequest, type SSECallbacks } from '@/shared/api/sse-client'
import type { GuidedProjectCandidate, Project, ProjectListItem, ProjectStatus, Asset } from '@/shared/api/types'
import { brainstormEventSchema, brainstormResultSchema } from '@/shared/api/runtime-schemas'

type ProjectListResponse = { projects: ProjectListItem[] }
type GuidedCandidatesResponse = { candidates: GuidedProjectCandidate[] }
type GuidedCreateResponse = { project: Project; created_assets: Asset[] }
export type BrainstormResult = { discussion_summary: string; candidates: GuidedProjectCandidate[] }
export type BrainstormEvent = {
  type: string
  agent?: 'story_architect' | 'world_architect' | 'character_designer' | 'chief_editor'
  round?: number
  hint?: string
}

export type UpsertProjectInput = {
  title: string
  summary: string
  status: ProjectStatus
}

export type GuidedProjectInput = {
  genre: string
  setting: string
  protagonist_archetype: string
  core_conflict: string
  tone: string
  custom_note?: string
}

export type GuidedCreateInput = {
  candidate: GuidedProjectCandidate
  persist_outline: boolean
  persist_worldbuilding: boolean
  persist_protagonist: boolean
}

export async function listProjects(params: {
  status?: ProjectStatus
  limit?: number
  offset?: number
} = {}): Promise<ProjectListItem[]> {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const qs = search.toString()
  const path = qs ? `/projects?${qs}` : '/projects'
  const result = await request<ProjectListResponse>(path)
  return result.projects
}

export function getProject(projectId: string): Promise<Project> {
  return request<Project>(`/projects/${projectId}`)
}

export function createProject(input: UpsertProjectInput): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: input,
  })
}

export function updateProject(projectId: string, input: UpsertProjectInput): Promise<Project> {
  return request<Project>(`/projects/${projectId}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteProject(projectId: string): Promise<void> {
  return request<void>(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}

export async function getGuidedProjectCandidates(input: GuidedProjectInput): Promise<GuidedProjectCandidate[]> {
  const result = await request<GuidedCandidatesResponse>('/projects/guided/candidates', {
    method: 'POST',
    body: input,
  })
  return result.candidates
}

export function createGuidedProject(input: GuidedCreateInput): Promise<GuidedCreateResponse> {
  return request<GuidedCreateResponse>('/projects/guided/create', {
    method: 'POST',
    body: input,
  })
}

export function brainstormGuidedProjectStream(
  input: GuidedProjectInput,
  callbacks: SSECallbacks<BrainstormResult>,
  onEvent: (event: BrainstormEvent) => void,
  signal?: AbortSignal,
): void {
  streamRequest<BrainstormResult>('/projects/guided/brainstorm', input, callbacks, signal, {
    doneEventName: 'result',
    timeoutMs: 300_000,
    parseDone: (rawData) => parseJsonWithSchema(rawData, brainstormResultSchema, 'brainstorm result'),
    onEvent: (eventType, rawData) => {
      if (eventType === 'result' || eventType === 'error') {
        return
      }
      try {
        onEvent(parseJsonWithSchema(rawData, brainstormEventSchema, `brainstorm ${eventType} event`))
      } catch {
        // ignore malformed progress events
      }
    },
  })
}
