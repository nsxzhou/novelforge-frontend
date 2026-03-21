import { act, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChaptersPanel } from './chapters-panel'
import { ToastProvider } from '@/shared/ui/toast'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import type { SSECallbacks } from '@/shared/api/sse-client'
import type { Asset, Chapter } from '@/shared/api/types'

const listAllAssetsMock = vi.fn()
const createChapterStreamMock = vi.fn()
const listAllChaptersMock = vi.fn()

vi.mock('@/shared/api/assets', () => ({
  listAllAssets: (...args: unknown[]) => listAllAssetsMock(...args),
}))

vi.mock('@/shared/api/chapters', () => ({
  confirmChapter: vi.fn(),
  unconfirmChapter: vi.fn(),
  createChapterStream: (...args: unknown[]) => createChapterStreamMock(...args),
  continueChapterStream: vi.fn(),
  getChapter: vi.fn(),
  listAllChapters: (...args: unknown[]) => listAllChaptersMock(...args),
  rewriteChapterStream: vi.fn(),
  updateChapter: vi.fn(),
}))

function renderWithProviders(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

function renderPanel() {
  return renderWithProviders(<ChaptersPanel projectId="project-1" />)
}

const volumeOnlyOutlineAsset: Asset = {
  id: 'asset-outline-volume-only',
  project_id: 'project-1',
  type: 'outline',
  title: '卷级大纲',
  content: JSON.stringify({
    _schema: 'outline_v2',
    premise: '先定分卷，再补章节。',
    volumes: [{
      title: '回声卷',
      summary: '广播异常卷',
      key_events: ['广播异常'],
      chapters: [],
    }],
    ending: '',
    notes: '',
  }),
  content_schema: 'outline_v2',
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const plannedOutlineAsset: Asset = {
  id: 'asset-outline-planned',
  project_id: 'project-1',
  type: 'outline',
  title: '章节大纲',
  content: JSON.stringify({
    _schema: 'outline_v2',
    premise: '雨夜追查真相。',
    volumes: [{
      title: '回声卷',
      summary: '广播异常卷',
      key_events: ['广播异常'],
      chapters: [{
        ordinal: 1,
        title: '第一章 雨夜来信',
        summary: '主角收到异常来信。',
        purpose: '建立悬念',
        must_include: ['雨夜', '神秘来信'],
      }],
    }],
    ending: '',
    notes: '',
  }),
  content_schema: 'outline_v2',
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const draftChapterOne: Chapter = {
  id: 'chapter-1',
  project_id: 'project-1',
  title: '第一章 雨夜来信',
  ordinal: 1,
  status: 'draft',
  content: '雨夜里，主角收到一封没有署名的来信。',
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

describe('ChaptersPanel', () => {
  let createStreamCallbacks: SSECallbacks<ChapterGenerationResponse> | null

  beforeEach(() => {
    vi.clearAllMocks()
    createStreamCallbacks = null
    listAllAssetsMock.mockResolvedValue([volumeOnlyOutlineAsset])
    listAllChaptersMock.mockResolvedValue([])
    createChapterStreamMock.mockImplementation(
      (
        _projectId: string,
        _input: unknown,
        callbacks: SSECallbacks<ChapterGenerationResponse>,
      ) => {
        createStreamCallbacks = callbacks
      },
    )
  })

  it('shows plan-chapters-first messaging for a valid volume-only outline', async () => {
    renderPanel()

    expect(await screen.findByText('当前仅完成分卷规划，请先补章节计划。')).toBeTruthy()
    expect(screen.queryByText('当前大纲结构无效，请先修复后再规划章节。')).toBeNull()
  })

  it('shows a normalized chapter stream error when createChapterStream fails with stage prefixes', async () => {
    listAllAssetsMock.mockResolvedValue([plannedOutlineAsset])

    const user = userEvent.setup()
    renderPanel()

    expect(await screen.findByText('从大纲计划中选择章节开始创作')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '新章节' }))
    expect(await screen.findByText('生成新章节')).toBeTruthy()

    await user.type(
      screen.getByPlaceholderText('描述本章生成要求，例如视角、节奏、重点冲突'),
      '聚焦雨夜冲突与来信谜团。',
    )
    await user.click(screen.getByRole('button', { name: '生成章节' }))

    expect(createChapterStreamMock).toHaveBeenCalledTimes(1)
    expect(createStreamCallbacks).toBeTruthy()

    await act(async () => {
      createStreamCallbacks?.onError('service: dependency unavailable: llm stream setup: llm client is not configured')
    })

    await waitFor(() => {
      expect(screen.getByText('AI Provider 未配置，请先在模型设置中启用可用 Provider。')).toBeTruthy()
    })
    expect(screen.queryByText(/service: dependency unavailable/i)).toBeNull()
    expect(screen.queryByText(/llm stream setup/i)).toBeNull()
  })

  it('renders chapter list items that navigate on click', async () => {
    listAllChaptersMock.mockResolvedValue([draftChapterOne])

    renderPanel()

    const chapterButton = await screen.findByRole('button', { name: /第1章 · 第一章 雨夜来信/ })
    expect(chapterButton).toBeTruthy()
    expect(screen.getByText('18 字')).toBeTruthy()
  })
})
