import { request } from '@/shared/api/http-client'
import type { KGNode, KGEdge } from '@/shared/api/types'

type NodeListResponse = { nodes: KGNode[] }
type EdgeListResponse = { edges: KGEdge[] }

export type CreateKGNodeInput = {
  type: string
  name: string
  properties?: string
  source_ref?: string
}

export type UpdateKGNodeInput = {
  type?: string
  name?: string
  properties?: string
  source_ref?: string
}

export type CreateKGEdgeInput = {
  source_id: string
  target_id: string
  type: string
  label?: string
  properties?: string
}

export function listKGNodes(projectId: string, type?: string): Promise<KGNode[]> {
  const params = type ? `?type=${type}` : ''
  return request<NodeListResponse>(`/projects/${projectId}/kg/nodes${params}`).then(r => r.nodes)
}

export function createKGNode(projectId: string, input: CreateKGNodeInput): Promise<KGNode> {
  return request<KGNode>(`/projects/${projectId}/kg/nodes`, { method: 'POST', body: input })
}

export function updateKGNode(projectId: string, nodeId: string, input: UpdateKGNodeInput): Promise<KGNode> {
  return request<KGNode>(`/projects/${projectId}/kg/nodes/${nodeId}`, { method: 'PUT', body: input })
}

export function deleteKGNode(projectId: string, nodeId: string): Promise<void> {
  return request(`/projects/${projectId}/kg/nodes/${nodeId}`, { method: 'DELETE' })
}

export function listKGEdges(projectId: string, type?: string): Promise<KGEdge[]> {
  const params = type ? `?type=${type}` : ''
  return request<EdgeListResponse>(`/projects/${projectId}/kg/edges${params}`).then(r => r.edges)
}

export function createKGEdge(projectId: string, input: CreateKGEdgeInput): Promise<KGEdge> {
  return request<KGEdge>(`/projects/${projectId}/kg/edges`, { method: 'POST', body: input })
}

export function deleteKGEdge(projectId: string, edgeId: string): Promise<void> {
  return request(`/projects/${projectId}/kg/edges/${edgeId}`, { method: 'DELETE' })
}

export function syncKnowledgeGraph(projectId: string): Promise<{ status: string }> {
  return request(`/projects/${projectId}/kg/sync`, { method: 'POST' })
}
