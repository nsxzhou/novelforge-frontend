import type { AssetType } from '@/shared/api/types'
import { characterSchema, createDefaultCharacter, type CharacterData } from './character-schema'
import {
  worldbuildingSchema,
  createDefaultWorldbuilding,
  type WorldbuildingData,
} from './worldbuilding-schema'

export type StructuredContent = CharacterData | WorldbuildingData
export type ContentFormat = 'structured' | 'plain'

/**
 * 检测资产内容格式：结构化 JSON 或纯文本。
 */
export function detectContentFormat(content: string, assetType: AssetType): ContentFormat {
  if (assetType === 'outline') return 'plain'

  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && '_schema' in parsed) {
      const schema = parsed._schema as string
      if (assetType === 'character' && schema === 'character_v1') return 'structured'
      if (assetType === 'worldbuilding' && schema === 'worldbuilding_v1') return 'structured'
    }
  } catch {
    // not JSON
  }

  return 'plain'
}

/**
 * 解析结构化内容并用 Zod 校验。
 */
export function parseStructuredContent(
  content: string,
  assetType: AssetType,
): StructuredContent | null {
  try {
    const parsed = JSON.parse(content)
    if (assetType === 'character') {
      const result = characterSchema.safeParse(parsed)
      return result.success ? result.data : null
    }
    if (assetType === 'worldbuilding') {
      const result = worldbuildingSchema.safeParse(parsed)
      return result.success ? result.data : null
    }
  } catch {
    // not valid JSON
  }
  return null
}

/**
 * 将结构化数据序列化为 JSON 字符串。
 */
export function serializeStructuredContent(data: StructuredContent): string {
  return JSON.stringify(data, null, 2)
}

/**
 * 创建指定类型的默认结构化内容。
 */
export function createDefaultStructuredContent(assetType: AssetType): StructuredContent | null {
  switch (assetType) {
    case 'character':
      return createDefaultCharacter()
    case 'worldbuilding':
      return createDefaultWorldbuilding()
    default:
      return null
  }
}

/**
 * 将旧版纯文本迁移为结构化内容（原文移入 notes 字段）。
 */
export function migrateToStructured(
  plainText: string,
  assetType: AssetType,
): StructuredContent | null {
  const base = createDefaultStructuredContent(assetType)
  if (!base) return null
  return { ...base, notes: plainText }
}
