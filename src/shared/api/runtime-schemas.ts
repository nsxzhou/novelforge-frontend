import { z } from 'zod'

export const assetTypeSchema = z.enum(['worldbuilding', 'character', 'outline'])
export const chapterStatusSchema = z.enum(['draft', 'confirmed'])
export const relationTypeSchema = z.enum(['ally', 'enemy', 'family', 'mentor', 'friend', 'rival', 'custom'])
export const relationTypeConfigSchema = z.object({
  value: relationTypeSchema,
  label: z.string(),
  color: z.string(),
})
export const characterRelationSchema = z.object({
  target: z.string().trim().min(1),
  type: relationTypeSchema,
  custom_label: z.string().optional(),
  description: z.string().optional(),
})

export const assetSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  type: assetTypeSchema,
  title: z.string(),
  content: z.string(),
  content_schema: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const chapterSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  title: z.string(),
  ordinal: z.number().int(),
  status: chapterStatusSchema,
  content: z.string(),
  summary: z.string().optional(),
  current_draft_id: z.string().optional(),
  current_draft_confirmed_at: z.string().optional(),
  current_draft_confirmed_by: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const generationRecordSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  chapter_id: z.string().optional(),
  conversation_id: z.string().optional(),
  kind: z.enum([
    'asset_generation',
    'chapter_generation',
    'chapter_continuation',
    'chapter_rewrite',
    'chapter_suggestion',
  ]),
  status: z.enum(['pending', 'running', 'succeeded', 'failed']),
  input_snapshot_ref: z.string(),
  output_ref: z.string(),
  token_usage: z.number(),
  duration_millis: z.number(),
  error_message: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
})

const characterSeedSchema = z.object({
  _schema: z.literal('character_v1'),
  name: z.string(),
  age: z.string().optional(),
  gender: z.string().optional(),
  personality_tags: z.array(z.string()).optional(),
  motivation: z.string().optional(),
  appearance: z.string().optional(),
  catchphrase: z.string().optional(),
  backstory: z.string().optional(),
  relationships: z.string().optional(),
  notes: z.string().optional(),
})

const worldbuildingSeedSchema = z.object({
  _schema: z.literal('worldbuilding_v1'),
  geography: z.string().optional(),
  politics: z.string().optional(),
  magic_system: z.string().optional(),
  technology_level: z.string().optional(),
  culture: z.string().optional(),
  history: z.string().optional(),
  economy: z.string().optional(),
  religion: z.string().optional(),
  notes: z.string().optional(),
})

const outlineChapterSeedSchema = z.object({
  ordinal: z.number().int(),
  title: z.string(),
  summary: z.string().optional(),
  purpose: z.string().optional(),
  must_include: z.array(z.string()).optional(),
})

const outlineVolumeSeedSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  key_events: z.array(z.string()).optional(),
  chapters: z.array(outlineChapterSeedSchema),
})

const outlineSeedSchema = z.object({
  _schema: z.literal('outline_v2'),
  premise: z.string().optional(),
  themes: z.array(z.string()).optional(),
  central_conflict: z.string().optional(),
  volumes: z.array(outlineVolumeSeedSchema).optional(),
  ending: z.string().optional(),
  notes: z.string().optional(),
})

export const guidedProjectCandidateSchema = z.object({
  title: z.string(),
  summary: z.string(),
  hook: z.string(),
  core_conflict: z.string(),
  tone: z.string(),
  outline_seed: outlineSeedSchema,
  worldbuilding_seed: worldbuildingSeedSchema,
  protagonist_seed: characterSeedSchema,
})

export const brainstormResultSchema = z.object({
  discussion_summary: z.string(),
  candidates: z.array(guidedProjectCandidateSchema),
})

export const brainstormEventSchema = z.object({
  type: z.string(),
  agent: z.enum(['story_architect', 'world_architect', 'character_designer', 'chief_editor']).optional(),
  round: z.number().int().optional(),
  hint: z.string().optional(),
})

export const chapterGenerationResponseSchema = z.object({
  chapter: chapterSchema,
  generation_record: generationRecordSchema,
})

export const assetGenerationResponseSchema = z.object({
  asset: assetSchema,
  generation_record: generationRecordSchema,
})

export const suggestResponseSchema = z.object({
  suggestion: z.string(),
})
