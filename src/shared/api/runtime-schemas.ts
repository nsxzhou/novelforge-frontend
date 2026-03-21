import { z } from 'zod'
import {
  assetTypeSchema,
  guidedProjectCandidateSchema,
} from '@/shared/api/contract-defs'

export const chapterStatusSchema = z.enum(['draft', 'confirmed'])

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
    'asset_refinement',
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
