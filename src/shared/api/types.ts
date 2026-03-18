export type ProjectStatus = 'draft' | 'active' | 'archived'

export type Project = {
  id: string
  title: string
  summary: string
  status: ProjectStatus
  created_at: string
  updated_at: string
}

export type AssetType = 'worldbuilding' | 'character' | 'outline'

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

export type CharacterRelationship = {
  target: string
  relation: string
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
