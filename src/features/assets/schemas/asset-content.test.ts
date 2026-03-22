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
      _schema: 'character_v2',
      name: '主角',
      personality_tags: ['冷静'],
    })

    expect(detectContentFormat(content, 'character')).toBe('structured')
    expect(detectContentFormat(content, 'outline')).toBe('schema_mismatch')
  })

  it('marks old schema payloads as schema mismatch', () => {
    const content = JSON.stringify({
      _schema: 'character_v1',
      name: '旧主角',
    })

    expect(detectContentFormat(content, 'character')).toBe('schema_mismatch')
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

  it('parses and serializes volume-only outlines', () => {
    const content = JSON.stringify({
      _schema: 'outline_v2',
      premise: '先确定卷级结构',
      volumes: [{
        title: '回声卷',
        chapters: [],
      }],
    })

    const parsed = parseStructuredContent(content, 'outline')
    expect(parsed).toEqual({
      _schema: 'outline_v2',
      premise: '先确定卷级结构',
      themes: [],
      central_conflict: '',
      volumes: [{
        title: '回声卷',
        summary: '',
        key_events: [],
        chapters: [],
      }],
      ending: '',
      notes: '',
    })
    expect(serializeStructuredContent(parsed!)).toContain('"chapters": []')
  })

  it('rejects non-continuous chapter ordinals when chapter plans exist', () => {
    const content = JSON.stringify({
      _schema: 'outline_v2',
      premise: '章节顺序错误',
      volumes: [{
        title: '第一卷',
        chapters: [
          { ordinal: 1, title: '第一章' },
          { ordinal: 3, title: '第三章' },
        ],
      }],
    })

    expect(parseStructuredContent(content, 'outline')).toBeNull()
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
      _schema: 'worldbuilding_v2',
      history: '旧版角色设定正文',
    })
  })

  it('parses comma-separated values while trimming blanks', () => {
    expect(parseCommaSeparated('勇敢, 冷静, , 谨慎')).toEqual(['勇敢', '冷静', '谨慎'])
    expect(parseCommaSeparated(['直接返回'])).toEqual(['直接返回'])
  })
})
