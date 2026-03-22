import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetsPanel } from './assets-panel'
import { ToastProvider } from '@/shared/ui/toast'
import type { SSECallbacks } from '@/shared/api/sse-client'
import type { AssetGenerationResponse } from '@/shared/api/assets'
import type { Asset } from '@/shared/api/types'

const listAllAssetsMock = vi.fn()
const createAssetMock = vi.fn()
const updateAssetMock = vi.fn()
const deleteAssetMock = vi.fn()
const generateAssetStreamMock = vi.fn()
const refineAssetStreamMock = vi.fn()

vi.mock('@/shared/api/assets', () => ({
  listAllAssets: (...args: unknown[]) => listAllAssetsMock(...args),
  createAsset: (...args: unknown[]) => createAssetMock(...args),
  updateAsset: (...args: unknown[]) => updateAssetMock(...args),
  deleteAsset: (...args: unknown[]) => deleteAssetMock(...args),
  generateAssetStream: (...args: unknown[]) => generateAssetStreamMock(...args),
  refineAssetStream: (...args: unknown[]) => refineAssetStreamMock(...args),
}))

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AssetsPanel projectId="project-1" />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AssetsPanel', () => {
  let assets: Asset[]
  let streamCallbacks: SSECallbacks<AssetGenerationResponse> | null
  let refineCallbacks: SSECallbacks<AssetGenerationResponse> | null

  beforeEach(() => {
    vi.clearAllMocks()
    assets = []
    streamCallbacks = null
    refineCallbacks = null

    listAllAssetsMock.mockImplementation(() => Promise.resolve([...assets]))
    createAssetMock.mockResolvedValue(undefined)
    updateAssetMock.mockResolvedValue(undefined)
    deleteAssetMock.mockResolvedValue(undefined)
    generateAssetStreamMock.mockImplementation(
      (
        _projectId: string,
        _input: unknown,
        callbacks: SSECallbacks<AssetGenerationResponse>,
      ) => {
        streamCallbacks = callbacks
      },
    )
    refineAssetStreamMock.mockImplementation(
      (
        _assetId: string,
        _input: unknown,
        callbacks: SSECallbacks<AssetGenerationResponse>,
      ) => {
        refineCallbacks = callbacks
      },
    )
  })

  async function openGeneratePanel() {
    const user = userEvent.setup()
    renderPanel()

    await screen.findByText('暂无设定资产')
    await user.click(screen.getByRole('button', { name: 'AI 生成' }))
    await user.type(screen.getByPlaceholderText('描述你希望生成的资产内容'), '生成一个冷静的主角')
    await user.click(screen.getByRole('button', { name: '发起生成' }))

    return user
  }

  it('does not render raw streaming json while generation is in progress', async () => {
    await openGeneratePanel()

    expect(generateAssetStreamMock).toHaveBeenCalled()
    expect(screen.getByText('AI 正在整理最终资产预览...')).toBeTruthy()

    await act(async () => {
      streamCallbacks?.onContent('{"_schema":"character_v1","name":"苏砚"}')
    })

    expect(screen.queryByText('{"_schema":"character_v1","name":"苏砚"}')).toBeNull()
  })

  it('shows structured preview after generation completes without auto-opening the editor', async () => {
    await openGeneratePanel()

    const generatedAsset: Asset = {
      id: 'asset-1',
      project_id: 'project-1',
      type: 'character',
      title: '主角人设',
      content: JSON.stringify({
        _schema: 'character_v1',
        name: '苏砚',
        age: '19',
        gender: '女',
        personality_tags: ['冷静', '克制'],
        motivation: '查清家族真相',
        appearance: '',
        catchphrase: '',
        backstory: '',
        relationships: '',
        notes: '',
      }),
      content_schema: 'character_v1',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }
    assets = [generatedAsset]

    await act(async () => {
      await streamCallbacks?.onDone({
        asset: generatedAsset,
        generation_record: {
          id: 'gen-1',
          project_id: 'project-1',
          kind: 'asset_generation',
          status: 'succeeded',
          input_snapshot_ref: 'in',
          output_ref: 'out',
          token_usage: 100,
          duration_millis: 800,
          created_at: '2026-03-19T10:00:00Z',
          updated_at: '2026-03-19T10:00:00Z',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('生成完成')).toBeTruthy()
    })

    expect(screen.getAllByText('苏砚').length).toBeGreaterThan(0)
    expect(screen.getAllByText('冷静').length).toBeGreaterThan(0)
    expect(screen.queryByText(/"_schema"/)).toBeNull()
    expect(screen.queryByDisplayValue('主角人设')).toBeNull()
  })

  it('opens the asset editor only when the user clicks edit from the preview', async () => {
    const user = await openGeneratePanel()

    const generatedAsset: Asset = {
      id: 'asset-2',
      project_id: 'project-1',
      type: 'character',
      title: '主角人设',
      content: JSON.stringify({
        _schema: 'character_v1',
        name: '苏砚',
        age: '19',
        gender: '女',
        personality_tags: ['冷静'],
        motivation: '查清家族真相',
        appearance: '',
        catchphrase: '',
        backstory: '',
        relationships: '',
        notes: '',
      }),
      content_schema: 'character_v1',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }
    assets = [generatedAsset]

    await act(async () => {
      await streamCallbacks?.onDone({
        asset: generatedAsset,
        generation_record: {
          id: 'gen-2',
          project_id: 'project-1',
          kind: 'asset_generation',
          status: 'succeeded',
          input_snapshot_ref: 'in',
          output_ref: 'out',
          token_usage: 100,
          duration_millis: 800,
          created_at: '2026-03-19T10:00:00Z',
          updated_at: '2026-03-19T10:00:00Z',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '编辑资产' })).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: '编辑资产' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '更新资产' })).toBeTruthy()
    })
    expect(screen.getByDisplayValue('主角人设')).toBeTruthy()
  })

  it('shows refine preview after success and closes after apply', async () => {
    assets = [{
      id: 'asset-3',
      project_id: 'project-1',
      type: 'character',
      title: '林澈',
      content: '初版角色设定',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }]

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('林澈')
    await user.click(screen.getByRole('button', { name: 'AI 优化' }))
    await user.type(screen.getByPlaceholderText('描述你希望 AI 优化的方向，例如补充细节、强化人物动机、梳理结构'), '强化人物动机')
    await user.click(screen.getByRole('button', { name: '开始优化' }))

    expect(refineAssetStreamMock).toHaveBeenCalledWith(
      'asset-3',
      { instruction: '强化人物动机' },
      expect.any(Object),
      expect.any(AbortSignal),
    )

    const refinedAsset: Asset = {
      ...assets[0],
      content: '强化后角色设定',
      updated_at: '2026-03-19T10:05:00Z',
    }
    assets = [refinedAsset]

    await act(async () => {
      await refineCallbacks?.onDone({
        asset: refinedAsset,
        generation_record: {
          id: 'gen-3',
          project_id: 'project-1',
          kind: 'asset_refinement',
          status: 'succeeded',
          input_snapshot_ref: 'in',
          output_ref: 'out',
          token_usage: 100,
          duration_millis: 800,
          created_at: '2026-03-19T10:05:00Z',
          updated_at: '2026-03-19T10:05:00Z',
        },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('优化结果预览')).toBeTruthy()
    })

    await user.click(screen.getByRole('button', { name: '应用优化' }))

    await waitFor(() => {
      expect(screen.queryByText('优化结果预览')).toBeNull()
    })
    expect(screen.getByText('强化后角色设定')).toBeTruthy()
  })

  it('opens refine from the outline tree view when the outline tab is active', async () => {
    assets = [{
      id: 'asset-outline-1',
      project_id: 'project-1',
      type: 'outline',
      title: '主线大纲',
      content: JSON.stringify({
        _schema: 'outline_v2',
        premise: '风雪中的追凶',
        volumes: [{
          title: '第一卷',
          chapters: [{
            ordinal: 1,
            title: '雪夜来客',
          }],
        }],
      }),
      content_schema: 'outline_v2',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }]

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('主线大纲')
    await user.click(screen.getByRole('button', { name: '📋 大纲' }))

    await screen.findByRole('button', { name: 'AI 优化大纲' })
    await user.click(screen.getByRole('button', { name: 'AI 优化大纲' }))
    await user.type(
      screen.getByPlaceholderText('描述你希望 AI 优化的方向，例如补充细节、强化人物动机、梳理结构'),
      '强化转折节奏',
    )
    await user.click(screen.getByRole('button', { name: '开始优化' }))

    expect(refineAssetStreamMock).toHaveBeenCalledWith(
      'asset-outline-1',
      { instruction: '强化转折节奏' },
      expect.any(Object),
      expect.any(AbortSignal),
    )
  })

  it('preserves content_schema when outline tree autosave updates the asset', async () => {
    assets = [{
      id: 'asset-outline-keep-schema',
      project_id: 'project-1',
      type: 'outline',
      title: '主线大纲',
      content: JSON.stringify({
        _schema: 'outline_v2',
        premise: '旧前提',
        themes: [],
        central_conflict: '',
        volumes: [{
          title: '第一卷',
          summary: '',
          key_events: [],
          chapters: [{
            ordinal: 1,
            title: '雪夜来客',
            summary: '',
            purpose: '',
            must_include: [],
          }],
        }],
        ending: '',
        notes: '',
      }),
      content_schema: 'outline_v2',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }]

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('主线大纲')
    await user.click(screen.getByRole('button', { name: '📋 大纲' }))
    await screen.findByPlaceholderText('一句话概括故事核心')

    const premiseInput = screen.getByPlaceholderText('一句话概括故事核心')
    await user.clear(premiseInput)
    await user.type(premiseInput, '新前提')

    await waitFor(() => {
      expect(updateAssetMock).toHaveBeenCalledWith(
        'asset-outline-keep-schema',
        expect.objectContaining({
          type: 'outline',
          title: '主线大纲',
          content_schema: 'outline_v2',
        }),
      )
    }, { timeout: 2000 })
  })

  it('shows an explicit repair state for invalid outline_v2 structured content', async () => {
    assets = [{
      id: 'asset-outline-invalid',
      project_id: 'project-1',
      type: 'outline',
      title: '旧版大纲',
      content: JSON.stringify({
        _schema: 'outline_v2',
        premise: '旧结构',
        chapters: [{ title: '第一章' }],
      }),
      content_schema: 'outline_v2',
      created_at: '2026-03-19T10:00:00Z',
      updated_at: '2026-03-19T10:00:00Z',
    }]

    renderPanel()
    const user = userEvent.setup()

    await screen.findByText('旧版大纲')
    await user.click(screen.getByRole('button', { name: '编辑大纲' }))

    await waitFor(() => {
      expect(screen.getByText('当前结构化内容无法被编辑器解析。 outline_v2 必须使用 volumes[].chapters[] 且章节 ordinal 连续。')).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: '切换到原始文本修复' })).toBeTruthy()
  })
})
