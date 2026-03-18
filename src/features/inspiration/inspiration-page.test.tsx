import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InspirationPage } from './inspiration-page'

const navigateMock = vi.fn()
const createProjectMock = vi.fn()
const getGuidedProjectCandidatesMock = vi.fn()
const createGuidedProjectMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/shared/api/projects', () => ({
  createProject: (...args: unknown[]) => createProjectMock(...args),
  getGuidedProjectCandidates: (...args: unknown[]) => getGuidedProjectCandidatesMock(...args),
  createGuidedProject: (...args: unknown[]) => createGuidedProjectMock(...args),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <InspirationPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

const guidedCandidates = [
  {
    title: '失忆轨道',
    summary: '宇航员在废弃空间站中寻找记忆与真相。',
    hook: '她醒来时发现日志里的自己已经死过一次。',
    core_conflict: '她必须在真相与自我保护之间做选择。',
    tone: '冷峻悬疑',
    outline_seed: {
      _schema: 'outline_v1',
      premise: '在封闭空间里追索身份真相。',
      themes: ['身份', '记忆'],
      central_conflict: '真相追索',
      volumes: [],
      ending: '主角接受自己并非原版人类。',
      notes: '强调生存压迫感。',
    },
    worldbuilding_seed: {
      _schema: 'worldbuilding_v1',
      geography: '近地轨道废弃站',
      politics: '企业控制的深空体系',
      magic_system: '',
      technology_level: '高科技近未来',
      culture: '冷硬工业',
      history: '空间站因事故封锁多年',
      economy: '',
      religion: '',
      notes: '资源紧缺。',
    },
    protagonist_seed: {
      _schema: 'character_v1',
      name: '林澈',
      age: '29',
      gender: '女',
      personality_tags: ['冷静', '警惕'],
      motivation: '搞清自己是谁',
      appearance: '',
      catchphrase: '',
      backstory: '从记忆空洞中醒来。',
      relationships: '',
      notes: '',
    },
  },
  {
    title: '深空疑云',
    summary: '调查员被困空间站并发现整座站是实验装置。',
    hook: '每层舱室都在重演同一天。',
    core_conflict: '打破循环会毁掉唯一幸存者。',
    tone: '压迫惊悚',
    outline_seed: {
      _schema: 'outline_v1',
      premise: '循环空间中的调查故事。',
      themes: ['循环', '牺牲'],
      central_conflict: '生存倒计时',
      volumes: [],
      ending: '主角亲手关闭系统。',
      notes: '重视密闭环境。',
    },
    worldbuilding_seed: {
      _schema: 'worldbuilding_v1',
      geography: '深空中继站',
      politics: '军工联合体',
      magic_system: '',
      technology_level: '军用前沿科技',
      culture: '',
      history: '一场实验后彻底失联',
      economy: '',
      religion: '',
      notes: '',
    },
    protagonist_seed: {
      _schema: 'character_v1',
      name: '周昼',
      age: '',
      gender: '',
      personality_tags: ['偏执'],
      motivation: '找出操控者',
      appearance: '',
      catchphrase: '',
      backstory: '前调查员。',
      relationships: '',
      notes: '',
    },
  },
  {
    title: '轨道回声',
    summary: '叛逃者在回声般重复的广播中追索事件根源。',
    hook: '广播里总有另一个自己先一步说话。',
    core_conflict: '她越接近控制室，真相越接近自毁。',
    tone: '黑色幽默',
    outline_seed: {
      _schema: 'outline_v1',
      premise: '广播谜题下的黑色生存故事。',
      themes: ['自我分裂'],
      central_conflict: '规则失控',
      volumes: [],
      ending: '主角成为新的广播源头。',
      notes: '',
    },
    worldbuilding_seed: {
      _schema: 'worldbuilding_v1',
      geography: '废弃轨道站',
      politics: '',
      magic_system: '',
      technology_level: '近未来',
      culture: '',
      history: '广播系统异常',
      economy: '',
      religion: '',
      notes: '',
    },
    protagonist_seed: {
      _schema: 'character_v1',
      name: '许岚',
      age: '',
      gender: '',
      personality_tags: ['嘴硬'],
      motivation: '逃离系统',
      appearance: '',
      catchphrase: '',
      backstory: '曾是维修员。',
      relationships: '',
      notes: '',
    },
  },
]

describe('InspirationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the two new project modes', () => {
    renderPage()

    expect(screen.getByText('AI 组合创建')).toBeTruthy()
    expect(screen.getByText('手动创建')).toBeTruthy()
    expect(screen.queryByPlaceholderText('描述你的故事灵感...')).toBeNull()
  })

  it('creates a manual project directly', async () => {
    createProjectMock.mockResolvedValue({
      id: 'project-1',
      title: '手动项目',
      summary: '手动简介',
      status: 'draft',
      created_at: '2026-03-18T00:00:00Z',
      updated_at: '2026-03-18T00:00:00Z',
    })

    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '改为手动创建' }))
    await user.type(screen.getByPlaceholderText('例如：失忆轨道'), '手动项目')
    await user.type(screen.getByPlaceholderText('一句话或一小段简介'), '手动简介')
    await user.click(screen.getByRole('button', { name: '创建项目' }))

    await waitFor(() => {
      expect(createProjectMock).toHaveBeenCalled()
      expect(createProjectMock.mock.calls[0]?.[0]).toEqual({
        title: '手动项目',
        summary: '手动简介',
        status: 'draft',
      })
    })
    expect(navigateMock).toHaveBeenCalledWith('/projects/project-1')
  })

  it('generates guided candidates and creates a guided project into assets tab', async () => {
    getGuidedProjectCandidatesMock.mockResolvedValue(guidedCandidates)
    createGuidedProjectMock.mockResolvedValue({
      project: {
        id: 'guided-1',
        title: guidedCandidates[1].title,
        summary: guidedCandidates[1].summary,
        status: 'draft',
        created_at: '2026-03-18T00:00:00Z',
        updated_at: '2026-03-18T00:00:00Z',
      },
      created_assets: [],
    })

    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '开始组合创建' }))
    await user.click(screen.getByRole('button', { name: '生成候选' }))

    await waitFor(() => {
      expect(getGuidedProjectCandidatesMock).toHaveBeenCalledWith({
        genre: '悬疑',
        setting: '近未来都市',
        protagonist_archetype: '失忆幸存者',
        core_conflict: '真相追索',
        tone: '冷峻悬疑',
        custom_note: '',
      })
    })

    await user.click(screen.getByText('深空疑云'))
    await user.click(screen.getByLabelText('大纲种子'))
    await user.click(screen.getByRole('button', { name: '创建项目并进入设定工坊' }))

    await waitFor(() => {
      expect(createGuidedProjectMock).toHaveBeenCalled()
      expect(createGuidedProjectMock.mock.calls[0]?.[0]).toEqual({
        candidate: guidedCandidates[1],
        persist_outline: false,
        persist_worldbuilding: true,
        persist_protagonist: true,
      })
    })
    expect(navigateMock).toHaveBeenCalledWith('/projects/guided-1?tab=assets')
  })
})
