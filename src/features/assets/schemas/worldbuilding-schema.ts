import { z } from 'zod'
import { worldbuildingSeedSchema } from '@/shared/api/contract-defs'

export const worldbuildingSchema = worldbuildingSeedSchema.extend({
  geography: z.string().optional().default(''),
  politics: z.string().optional().default(''),
  magic_system: z.string().optional().default(''),
  culture: z.string().optional().default(''),
  history: z.string().optional().default(''),
})

export type WorldbuildingData = z.infer<typeof worldbuildingSchema>

export function createDefaultWorldbuilding(): WorldbuildingData {
  return {
    _schema: 'worldbuilding_v2',
    geography: '',
    politics: '',
    magic_system: '',
    culture: '',
    history: '',
  }
}
