import type { z } from 'zod'
import { ASSET_TYPE_TO_SCHEMA } from '@/shared/api/generated/contracts'
import type { AssetType } from '@/shared/api/types'
import { characterSchema, createDefaultCharacter, type CharacterData } from './character-schema'
import {
  worldbuildingSchema,
  createDefaultWorldbuilding,
  type WorldbuildingData,
} from './worldbuilding-schema'
import {
  outlineSchema,
  createDefaultOutline,
  resequenceOutlineOrdinals,
  type OutlineData,
} from './outline-schema'

export type StructuredContent = CharacterData | WorldbuildingData | OutlineData
export type ContentFormat = 'structured' | 'plain'
export { ASSET_TYPE_TO_SCHEMA }

/** AssetType → Zod schema 的唯一映射。 */
const SCHEMA_PARSERS: Partial<Record<AssetType, z.ZodType<StructuredContent>>> = {
  character: characterSchema as z.ZodType<StructuredContent>,
  worldbuilding: worldbuildingSchema as z.ZodType<StructuredContent>,
  outline: outlineSchema as z.ZodType<StructuredContent>,
}

/**
 * 检测资产内容格式：结构化 JSON 或纯文本。
 */
export function detectContentFormat(content: string, assetType: AssetType): ContentFormat {
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object' && '_schema' in parsed) {
      if (parsed._schema === ASSET_TYPE_TO_SCHEMA[assetType]) return 'structured'
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
  const schema = SCHEMA_PARSERS[assetType]
  if (!schema) return null
  try {
    const result = schema.safeParse(JSON.parse(content))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

/**
 * 将结构化数据序列化为 JSON 字符串。
 */
export function serializeStructuredContent(data: StructuredContent): string {
  const normalized = data._schema === 'outline_v2'
    ? resequenceOutlineOrdinals(data as OutlineData)
    : data
  return JSON.stringify(normalized, null, 2)
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
    case 'outline':
      return createDefaultOutline()
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

/**
 * 将逗号分隔的字符串解析为数组（用于表单 setValueAs）。
 */
export function parseCommaSeparated(v: string | string[]): string[] {
  return Array.isArray(v) ? v : v.split(',').map((s) => s.trim()).filter(Boolean)
}
