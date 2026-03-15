import { z } from 'zod'

export const characterSchema = z.object({
  _schema: z.literal('character_v1'),
  name: z.string().min(1, '姓名必填'),
  age: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  personality_tags: z.array(z.string()).optional().default([]),
  motivation: z.string().optional().default(''),
  appearance: z.string().optional().default(''),
  catchphrase: z.string().optional().default(''),
  backstory: z.string().optional().default(''),
  relationships: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

export type CharacterData = z.infer<typeof characterSchema>

export function createDefaultCharacter(): CharacterData {
  return {
    _schema: 'character_v1',
    name: '',
    age: '',
    gender: '',
    personality_tags: [],
    motivation: '',
    appearance: '',
    catchphrase: '',
    backstory: '',
    relationships: '',
    notes: '',
  }
}
