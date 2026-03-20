import { describe, expect, it, vi } from 'vitest'
import { brainstormGuidedProjectStream } from '@/shared/api/projects'

const streamRequestWithSchemaMock = vi.fn()

vi.mock('@/shared/api/sse-client', () => ({
  parseJsonWithSchema: vi.fn(),
  streamRequestWithSchema: (...args: unknown[]) => streamRequestWithSchemaMock(...args),
}))

describe('projects api', () => {
  it('uses brainstorm timeout policy mode for guided brainstorm', () => {
    brainstormGuidedProjectStream(
      {
        genre: '悬疑',
        setting: '近未来',
        protagonist_archetype: '失忆幸存者',
        core_conflict: '真相追索',
        tone: '冷峻',
      },
      {
        onContent: vi.fn(),
        onDone: vi.fn(),
        onError: vi.fn(),
      },
      vi.fn(),
    )

    expect(streamRequestWithSchemaMock).toHaveBeenCalledWith(
      '/projects/guided/brainstorm',
      expect.any(Object),
      expect.any(Object),
      expect.anything(),
      'brainstorm result',
      undefined,
      expect.objectContaining({
        doneEventName: 'result',
        timeoutMode: 'brainstorm',
      }),
    )
  })
})
