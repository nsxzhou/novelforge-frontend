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

export type OutlineVolumeSeed = {
  title: string
  summary?: string
  key_events?: string[]
}

export type OutlineSeed = {
  _schema: 'outline_v1'
  premise?: string
  themes?: string[]
  central_conflict?: string
  volumes?: OutlineVolumeSeed[]
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

export type ProjectStats = {
  project_id: string
  chapter_count: number
  word_count: number
}
