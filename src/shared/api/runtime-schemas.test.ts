import { describe, expect, it } from 'vitest'
import { brainstormResultSchema } from '@/shared/api/runtime-schemas'

describe('runtime schemas', () => {
  it('accepts brainstorm results with v2 worldbuilding and protagonist seeds', () => {
    const result = brainstormResultSchema.parse({
      discussion_summary: '主编汇总出三个卷级方向。',
      candidates: [
        {
          title: '失忆轨道',
          summary: '宇航员在废弃空间站中寻找记忆与真相。',
          hook: '她醒来时发现日志里的自己已经死过一次。',
          core_conflict: '真相追索',
          tone: '冷峻悬疑',
          outline_seed: {
            _schema: 'outline_v2',
            premise: '在封闭空间里追索身份真相。',
            themes: ['身份', '记忆'],
            central_conflict: '真相追索',
            volumes: [
              {
                title: '第一卷',
                summary: '封闭空间求生卷',
                key_events: ['醒来', '追查日志'],
                chapters: [],
              },
            ],
            ending: '主角接受自己并非原版人类。',
            notes: '强调生存压迫感。',
          },
          worldbuilding_seed: {
            _schema: 'worldbuilding_v2',
            geography: '近地轨道废弃站',
            politics: '企业控制的深空体系',
            magic_system: '',
            culture: '冷硬工业',
            history: '空间站因事故封锁多年',
          },
          protagonist_seed: {
            _schema: 'character_v2',
            name: '林澈',
            gender: '女',
            personality_tags: ['冷静', '警惕'],
            motivation: '搞清自己是谁',
            backstory: '从记忆空洞中醒来。',
          },
        },
      ],
    })

    expect(result.candidates[0]?.worldbuilding_seed._schema).toBe('worldbuilding_v2')
    expect(result.candidates[0]?.protagonist_seed._schema).toBe('character_v2')
  })
})
