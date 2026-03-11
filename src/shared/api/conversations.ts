import { request } from '@/shared/api/http-client'
import type { Asset, Conversation, Project } from '@/shared/api/types'

type ConversationListResponse = { conversations: Conversation[] }

type ConfirmConversationResponse = {
  conversation: Conversation
  project?: Project
  asset?: Asset
}

export type StartConversationInput = {
  target_type: 'project' | 'asset'
  target_id: string
  message: string
}

export type ReplyConversationInput = {
  message: string
}

export function startConversation(
  projectId: string,
  input: StartConversationInput,
): Promise<Conversation> {
  return request<Conversation>(`/projects/${projectId}/conversations`, {
    method: 'POST',
    body: input,
  })
}

export function replyConversation(
  conversationId: string,
  input: ReplyConversationInput,
): Promise<Conversation> {
  return request<Conversation>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: input,
  })
}

export function confirmConversation(conversationId: string): Promise<ConfirmConversationResponse> {
  return request<ConfirmConversationResponse>(`/conversations/${conversationId}/confirm`, {
    method: 'POST',
  })
}

export function getConversation(conversationId: string): Promise<Conversation> {
  return request<Conversation>(`/conversations/${conversationId}`)
}

export function listConversations(params: {
  projectId: string
  targetType?: 'project' | 'asset'
  targetId?: string
  limit?: number
  offset?: number
}): Promise<Conversation[]> {
  const search = new URLSearchParams()
  if (params.targetType) search.set('target_type', params.targetType)
  if (params.targetId) search.set('target_id', params.targetId)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const path = `/projects/${params.projectId}/conversations?${search.toString()}`
  return request<ConversationListResponse>(path).then((r) => r.conversations)
}
