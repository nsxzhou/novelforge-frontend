import { GENERATED_RELATION_TYPES } from '@/shared/api/generated/contracts'
import type {
  AssetType,
  RelationType,
} from '@/shared/api/contract-defs'
export type {
  CharacterSeed,
  GuidedProjectCandidate,
  OutlineChapterSeed,
  OutlineSeed,
  OutlineVolumeSeed,
  WorldbuildingSeed,
  AssetType,
  RelationType,
} from '@/shared/api/contract-defs'

export type ProjectStatus = 'draft' | 'active' | 'archived'

export type Project = {
  id: string
  title: string
  summary: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export type ProjectListItem = Project & {
  chapter_count: number
  word_count: number
}

export type Asset = {
  id: string
  project_id: string
  type: AssetType
  title: string
  content: string
  content_schema?: string
  created_at: string
  updated_at: string
}

export type ChapterStatus = 'draft' | 'confirmed'

export type Chapter = {
  id: string
  project_id: string
  title: string
  ordinal: number
  status: ChapterStatus
  content: string
  summary?: string
  current_draft_id?: string
  current_draft_confirmed_at?: string
  current_draft_confirmed_by?: string
  created_at: string
  updated_at: string
}

// 关系类型配置
export interface RelationTypeConfig {
  value: RelationType
  label: string
  color: string
}

export interface CharacterRelation {
  target: string
  type: RelationType
  custom_label?: string
  description?: string
}

// 默认关系类型配置，来自后端生成元数据。
export const DEFAULT_RELATION_TYPES: RelationTypeConfig[] = [...GENERATED_RELATION_TYPES]

// 获取关系显示标签
export function getRelationLabel(
  relation: CharacterRelation,
  relationTypes: RelationTypeConfig[] = DEFAULT_RELATION_TYPES,
): string {
  if (relation.type === 'custom') {
    return relation.custom_label || '自定义'
  }
  return relationTypes.find((t) => t.value === relation.type)?.label || relation.type
}

// 获取关系颜色
export function getRelationColor(
  type: RelationType,
  relationTypes: RelationTypeConfig[] = DEFAULT_RELATION_TYPES,
): string {
  return relationTypes.find((t) => t.value === type)?.color || '#6B7280'
}

export type CharacterState = {
  id: string
  project_id: string
  chapter_id: string
  character_name: string
  location: string
  emotional_state: string
  relationships: CharacterRelation[]
  notes: string
  source: 'extracted' | 'manual'
  created_at: string
  updated_at: string
}

export type TimelineEvent = {
  id: string
  project_id: string
  chapter_id: string
  ordinal: number
  summary: string
  story_time: string
  source: 'extracted' | 'manual'
  created_at: string
  updated_at: string
}

export type GenerationKind =
  | 'asset_generation'
  | 'chapter_generation'
  | 'chapter_continuation'
  | 'chapter_rewrite'
  | 'chapter_suggestion'

export type GenerationStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export type GenerationRecord = {
  id: string
  project_id: string
  chapter_id?: string
  conversation_id?: string
  kind: GenerationKind
  status: GenerationStatus
  input_snapshot_ref: string
  output_ref: string
  token_usage: number
  duration_millis: number
  error_message?: string
  created_at: string
  updated_at: string
}

export type LLMProvider = {
  id: string
  provider: string
  model: string
  base_url: string
  api_key_masked: string
  timeout_seconds: number
  priority: number
  enabled: boolean
}

export type LLMProviderTestResult = {
  provider_id: string
  success: boolean
  latency_ms: number
  message: string
}

export type PromptTemplate = {
  capability: string
  system: string
  user: string
  is_override: boolean
  available_variables: string[]
}

export type ProjectStats = {
  project_id: string
  chapter_count: number
  word_count: number
}
