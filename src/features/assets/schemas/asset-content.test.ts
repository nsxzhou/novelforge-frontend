import { describe, expect, it } from 'vitest'
import {
  detectContentFormat,
  migrateToStructured,
  parseCommaSeparated,
  parseStructuredContent,
  serializeStructuredContent,
} from './asset-content'

describe('asset-content helpers', () => {
  it('detects structured content when schema matches the asset type', () => {
    const content = JSON.stringify({
      _schema: 'character_v1',
      name: '主角',
      personality_tags: ['冷静'],
    })

    expect(detectContentFormat(content, 'character')).toBe('structured')
    expect(detectContentFormat(content, 'outline')).toBe('plain')
  })

  it('parses and serializes structured content with schema defaults', () => {
    const content = JSON.stringify({
      _schema: 'outline_v2',
      premise: '一个世界将要崩塌',
      volumes: [{
        title: '第一卷',
        chapters: [{
          ordinal: 1,
          title: '第一章 序曲',
        }],
      }],
    })

    const parsed = parseStructuredContent(content, 'outline')
    expect(parsed).toEqual({
      _schema: 'outline_v2',
      premise: '一个世界将要崩塌',
      themes: [],
      central_conflict: '',
      volumes: [{
        title: '第一卷',
        summary: '',
        key_events: [],
        chapters: [{
          ordinal: 1,
          title: '第一章 序曲',
          summary: '',
          purpose: '',
          must_include: [],
        }],
      }],
      ending: '',
      notes: '',
    })
    expect(serializeStructuredContent(parsed!)).toContain('"premise": "一个世界将要崩塌"')
  })

  it('rejects legacy outline_v2 payloads without volumes', () => {
    const content = JSON.stringify({
      _schema: 'outline_v2',
      premise: '旧结构',
      chapters: [{ title: '第一章' }],
    })

    expect(parseStructuredContent(content, 'outline')).toBeNull()
  })

  it('migrates plain text into the notes field of structured content', () => {
    const migrated = migrateToStructured('旧版角色设定正文', 'worldbuilding')
    expect(migrated).toMatchObject({
      _schema: 'worldbuilding_v1',
      notes: '旧版角色设定正文',
    })
  })

  it('parses comma-separated values while trimming blanks', () => {
    expect(parseCommaSeparated('勇敢, 冷静, , 谨慎')).toEqual(['勇敢', '冷静', '谨慎'])
    expect(parseCommaSeparated(['直接返回'])).toEqual(['直接返回'])
  })
})
