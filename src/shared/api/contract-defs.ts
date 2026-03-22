import { z } from 'zod'
import { ASSET_TYPE_TO_SCHEMA, GENERATED_RELATION_TYPES } from '@/shared/api/generated/contracts'

export type AssetType = keyof typeof ASSET_TYPE_TO_SCHEMA
export const assetTypeValues = Object.keys(ASSET_TYPE_TO_SCHEMA) as [AssetType, ...AssetType[]]
export const assetTypeSchema = z.enum(assetTypeValues)

export type RelationType = (typeof GENERATED_RELATION_TYPES)[number]['value']
export const relationTypeValues = GENERATED_RELATION_TYPES.map((type) => type.value) as [
  RelationType,
  ...RelationType[],
]
export const relationTypeSchema = z.enum(relationTypeValues)

export const characterSeedSchema = z.object({
  _schema: z.literal(ASSET_TYPE_TO_SCHEMA.character),
  name: z.string(),
  gender: z.string().optional(),
  personality_tags: z.array(z.string()).optional(),
  motivation: z.string().optional(),
  backstory: z.string().optional(),
})

export const worldbuildingSeedSchema = z.object({
  _schema: z.literal(ASSET_TYPE_TO_SCHEMA.worldbuilding),
  geography: z.string().optional(),
  politics: z.string().optional(),
  magic_system: z.string().optional(),
  culture: z.string().optional(),
  history: z.string().optional(),
})

export const outlineChapterSeedSchema = z.object({
  ordinal: z.number().int(),
  title: z.string(),
  summary: z.string().optional(),
  purpose: z.string().optional(),
  must_include: z.array(z.string()).optional(),
})

export const outlineVolumeSeedSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  key_events: z.array(z.string()).optional(),
  chapters: z.array(outlineChapterSeedSchema),
})

export const outlineSeedSchema = z.object({
  _schema: z.literal(ASSET_TYPE_TO_SCHEMA.outline),
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

export type CharacterSeed = z.infer<typeof characterSeedSchema>
export type WorldbuildingSeed = z.infer<typeof worldbuildingSeedSchema>
export type OutlineChapterSeed = z.infer<typeof outlineChapterSeedSchema>
export type OutlineVolumeSeed = z.infer<typeof outlineVolumeSeedSchema>
export type OutlineSeed = z.infer<typeof outlineSeedSchema>
export type GuidedProjectCandidate = z.infer<typeof guidedProjectCandidateSchema>
