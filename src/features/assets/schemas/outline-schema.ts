import { z } from 'zod'
import {
  outlineChapterSeedSchema,
  outlineSeedSchema,
  outlineVolumeSeedSchema,
} from '@/shared/api/contract-defs'

function trimStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

export const outlineChapterPlanSchema = outlineChapterSeedSchema.extend({
  ordinal: z.number().int().positive().default(1),
  title: z.string().default(''),
  summary: z.string().default(''),
  purpose: z.string().default(''),
  must_include: z.array(z.string()).default([]),
}).strict()

export const outlineVolumeSchema = outlineVolumeSeedSchema.extend({
  title: z.string().default(''),
  summary: z.string().default(''),
  key_events: z.array(z.string()).default([]),
  chapters: z.array(outlineChapterPlanSchema),
}).strict()

export const outlineSchema = outlineSeedSchema.extend({
  premise: z.string().default(''),
  themes: z.array(z.string()).default([]),
  central_conflict: z.string().default(''),
  volumes: z.array(outlineVolumeSchema).min(1, '至少需要一个分卷'),
  ending: z.string().default(''),
  notes: z.string().default(''),
}).strict().superRefine((outline, ctx) => {
  const chapters = outline.volumes.flatMap((volume) => volume.chapters)
  const ordinals = chapters.map((chapter) => chapter.ordinal).sort((a, b) => a - b)

  if (ordinals.length === 0) {
    return
  }

  for (let index = 0; index < ordinals.length; index += 1) {
    if (ordinals[index] !== index + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '章节 ordinal 必须全局唯一且连续覆盖 1..N',
        path: ['volumes'],
      })
      break
    }
  }
})

export type OutlineData = z.infer<typeof outlineSchema>
export type OutlineVolume = z.infer<typeof outlineVolumeSchema>
export type OutlineChapterPlan = z.infer<typeof outlineChapterPlanSchema>

export function createDefaultChapter(ordinal = 1): OutlineChapterPlan {
  return {
    ordinal,
    title: '',
    summary: '',
    purpose: '',
    must_include: [],
  }
}

export function createDefaultVolume(firstChapterOrdinal = 1): OutlineVolume {
  return {
    title: '',
    summary: '',
    key_events: [],
    chapters: [createDefaultChapter(firstChapterOrdinal)],
  }
}

export function createDefaultOutline(): OutlineData {
  return {
    _schema: 'outline_v2',
    premise: '',
    themes: [],
    central_conflict: '',
    volumes: [createDefaultVolume(1)],
    ending: '',
    notes: '',
  }
}

type OutlineLike = {
  volumes?: Array<{
    title?: string
    summary?: string
    key_events?: string[]
    chapters?: Array<{
      ordinal?: number
      title?: string
      summary?: string
      purpose?: string
      must_include?: string[]
    }>
  }>
}

export function resequenceOutlineOrdinals(outline: OutlineData): OutlineData {
  let nextOrdinal = 1

  return {
    ...outline,
    themes: trimStringList(outline.themes ?? []),
    volumes: (outline.volumes ?? []).map((volume) => ({
      ...volume,
      key_events: trimStringList(volume.key_events ?? []),
      chapters: (volume.chapters ?? []).map((chapter) => ({
        ...chapter,
        ordinal: nextOrdinal++,
        must_include: trimStringList(chapter.must_include ?? []),
      })),
    })),
  }
}

export function flattenOutlineChapters(outline: OutlineLike | null | undefined): OutlineChapterPlan[] {
  if (!outline) return []

  return (outline.volumes ?? [])
    .flatMap((volume) => (volume.chapters ?? []).map((chapter) => ({
      ordinal: chapter.ordinal ?? 0,
      title: chapter.title ?? '',
      summary: chapter.summary ?? '',
      purpose: chapter.purpose ?? '',
      must_include: chapter.must_include ?? [],
    })))
    .slice()
    .sort((a, b) => a.ordinal - b.ordinal)
}
