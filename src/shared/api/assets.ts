import { request } from '@/shared/api/http-client'
import { parseJsonWithSchema, streamRequest, type SSECallbacks } from '@/shared/api/sse-client'
import type { Asset, AssetType, GenerationRecord } from '@/shared/api/types'
import { assetGenerationResponseSchema } from '@/shared/api/runtime-schemas'

type AssetListResponse = { assets: Asset[] }
export type AssetGenerationResponse = { asset: Asset; generation_record: GenerationRecord }

export type UpsertAssetInput = {
  type: AssetType
  title: string
  content: string
  content_schema?: string
}

export type GenerateAssetInput = {
  type: AssetType
  instruction: string
}

export async function listAssets(params: {
  projectId: string
  type?: AssetType
  limit?: number
  offset?: number
}): Promise<Asset[]> {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))
  const qs = search.toString()
  const path = qs
    ? `/projects/${params.projectId}/assets?${qs}`
    : `/projects/${params.projectId}/assets`
  const result = await request<AssetListResponse>(path)
  return result.assets
}

export async function listAllAssets(params: {
  projectId: string
  type?: AssetType
  pageSize?: number
}): Promise<Asset[]> {
  const pageSize = params.pageSize ?? 100
  const assets: Asset[] = []
  let offset = 0

  while (true) {
    const page = await listAssets({
      projectId: params.projectId,
      type: params.type,
      limit: pageSize,
      offset,
    })

    assets.push(...page)

    if (page.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return assets
}

export function createAsset(projectId: string, input: UpsertAssetInput): Promise<Asset> {
  return request<Asset>(`/projects/${projectId}/assets`, {
    method: 'POST',
    body: input,
  })
}

export function updateAsset(assetId: string, input: UpsertAssetInput): Promise<Asset> {
  return request<Asset>(`/assets/${assetId}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteAsset(assetId: string): Promise<void> {
  return request<void>(`/assets/${assetId}`, {
    method: 'DELETE',
  })
}

export function generateAsset(
  projectId: string,
  input: GenerateAssetInput,
): Promise<AssetGenerationResponse> {
  return request<AssetGenerationResponse>(`/projects/${projectId}/assets/generate`, {
    method: 'POST',
    body: input,
  })
}

export function generateAssetStream(
  projectId: string,
  input: GenerateAssetInput,
  callbacks: SSECallbacks<AssetGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequest(`/projects/${projectId}/assets/generate/stream`, input, callbacks, signal, {
    parseDone: (rawData) => parseJsonWithSchema(rawData, assetGenerationResponseSchema, 'asset generation result'),
  })
}
