import { request } from '@/shared/api/http-client'
import type { Project, ProjectStatus } from '@/shared/api/types'

type ProjectListResponse = { projects: Project[] }

export type UpsertProjectInput = {
  title: string
  summary: string
  status: ProjectStatus
}

export async function listProjects(params: {
  status?: ProjectStatus
  limit?: number
  offset?: number
} = {}): Promise<Project[]> {
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
