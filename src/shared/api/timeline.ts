import { request } from '@/shared/api/http-client'
import type { TimelineEvent } from '@/shared/api/types'

type TimelineListResponse = { events: TimelineEvent[] }

export type CreateTimelineEventInput = {
  chapter_id: string
  summary: string
  story_time: string
}

export type UpdateTimelineEventInput = {
  summary: string
  story_time: string
}

export function listTimelineEvents(projectId: string): Promise<TimelineEvent[]> {
  return request<TimelineListResponse>(`/projects/${projectId}/timeline`).then((response) => response.events)
}

export function createTimelineEvent(
  projectId: string,
  input: CreateTimelineEventInput,
): Promise<TimelineEvent> {
  return request<TimelineEvent>(`/projects/${projectId}/timeline`, {
    method: 'POST',
    body: input,
  })
}

export function updateTimelineEvent(
  projectId: string,
  eventId: string,
  input: UpdateTimelineEventInput,
): Promise<TimelineEvent> {
  return request<TimelineEvent>(`/projects/${projectId}/timeline/${eventId}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteTimelineEvent(projectId: string, eventId: string): Promise<void> {
  return request<void>(`/projects/${projectId}/timeline/${eventId}`, {
    method: 'DELETE',
  })
}
