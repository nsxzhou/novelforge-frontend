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

export type AssetType = 'worldbuilding' | 'character' | 'outline'

export type CharacterSeed = {
  _schema: 'character_v1'
  name: string
  age?: string
  gender?: string
  personality_tags?: string[]
  motivation?: string
  appearance?: string
  catchphrase?: string
  backstory?: string
  relationships?: string
  notes?: string
}

export type WorldbuildingSeed = {
  _schema: 'worldbuilding_v1'
  geography?: string
  politics?: string
  magic_system?: string
  technology_level?: string
  culture?: string
  history?: string
  economy?: string
  religion?: string
  notes?: string
}

export type OutlineChapterSeed = {
  title: string
  summary?: string
  key_events?: string[]
}

export type OutlineSeed = {
  _schema: 'outline_v2'
  premise?: string
  themes?: string[]
  central_conflict?: string
  chapters?: OutlineChapterSeed[]
  ending?: string
  notes?: string
}

export type GuidedProjectCandidate = {
  title: string
  summary: string
  hook: string
  core_conflict: string
  tone: string
  outline_seed: OutlineSeed
  worldbuilding_seed: WorldbuildingSeed
  protagonist_seed: CharacterSeed
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

// 关系类型枚举
export type RelationType =
  | 'ally'      // 盟友
  | 'enemy'     // 敌对
  | 'family'    // 亲属
  | 'mentor'    // 师徒
  | 'friend'    // 朋友
  | 'rival'     // 对手
  | 'custom'    // 自定义

// 关系类型配置
export interface RelationTypeConfig {
  value: RelationType
  label: string
  color: string
}

// 结构化关系（新格式）
export interface CharacterRelation {
  target: string
  type: RelationType
  custom_label?: string
  description?: string
}

// 旧格式兼容
export type CharacterRelationship = {
  target: string
  relation: string
}

// 默认关系类型配置
export const RELATION_TYPES: RelationTypeConfig[] = [
  { value: 'ally', label: '盟友', color: '#10B981' },
  { value: 'enemy', label: '敌对', color: '#EF4444' },
  { value: 'family', label: '亲属', color: '#3B82F6' },
  { value: 'mentor', label: '师徒', color: '#F59E0B' },
  { value: 'friend', label: '朋友', color: '#8B5CF6' },
  { value: 'rival', label: '对手', color: '#EC4899' },
  { value: 'custom', label: '自定义', color: '#6B7280' },
]

// 获取关系显示标签
export function getRelationLabel(relation: CharacterRelation): string {
  if (relation.type === 'custom') {
    return relation.custom_label || '自定义'
  }
  return RELATION_TYPES.find((t) => t.value === relation.type)?.label || relation.type
}

// 获取关系颜色
export function getRelationColor(type: RelationType): string {
  return RELATION_TYPES.find((t) => t.value === type)?.color || '#6B7280'
}

export type CharacterState = {
  id: string
  project_id: string
  chapter_id: string
  character_name: string
  location: string
  emotional_state: string
  relationships: string
  notes: string
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
  api_key: string
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
