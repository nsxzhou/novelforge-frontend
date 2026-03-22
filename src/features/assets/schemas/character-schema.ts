import { z } from 'zod'
import { characterSeedSchema } from '@/shared/api/contract-defs'

export const characterSchema = characterSeedSchema.extend({
  name: z.string().min(1, '姓名必填'),
  gender: z.string().optional().default(''),
  personality_tags: z.array(z.string()).optional().default([]),
  motivation: z.string().optional().default(''),
  backstory: z.string().optional().default(''),
})

export type CharacterData = z.infer<typeof characterSchema>

export function createDefaultCharacter(): CharacterData {
  return {
    _schema: 'character_v2',
    name: '',
    gender: '',
    personality_tags: [],
    motivation: '',
    backstory: '',
  }
}
