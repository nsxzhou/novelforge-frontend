import { z } from 'zod'

const outlineVolumeSchema = z.object({
  title: z.string().default(''),
  summary: z.string().default(''),
  key_events: z.array(z.string()).default([]),
})

export const outlineSchema = z.object({
  _schema: z.literal('outline_v1'),
  premise: z.string().default(''),
  themes: z.array(z.string()).default([]),
  central_conflict: z.string().default(''),
  volumes: z.array(outlineVolumeSchema).default([]),
  ending: z.string().default(''),
  notes: z.string().default(''),
})

export type OutlineData = z.infer<typeof outlineSchema>
export type OutlineVolume = z.infer<typeof outlineVolumeSchema>

export function createDefaultOutline(): OutlineData {
  return outlineSchema.parse({ _schema: 'outline_v1' })
}
