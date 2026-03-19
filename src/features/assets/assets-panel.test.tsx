import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetsPanel } from './assets-panel'
import { ToastProvider } from '@/shared/ui/toast'
import type { SSECallbacks } from '@/shared/api/sse-client'
import type { AssetGenerationResponse } from '@/shared/api/assets'
import type { Asset } from '@/shared/api/types'

const listAssetsMock = vi.fn()
const createAssetMock = vi.fn()
const updateAssetMock = vi.fn()
const deleteAssetMock = vi.fn()
const generateAssetStreamMock = vi.fn()

vi.mock('@/shared/api/assets', () => ({
  listAssets: (...args: unknown[]) => listAssetsMock(...args),
  createAsset: (...args: unknown[]) => createAssetMock(...args),
  updateAsset: (...args: unknown[]) => updateAssetMock(...args),
  deleteAsset: (...args: unknown[]) => deleteAssetMock(...args),
  generateAssetStream: (...args: unknown[]) => generateAssetStreamMock(...args),
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

  beforeEach(() => {
    vi.clearAllMocks()
    assets = []
    streamCallbacks = null

    listAssetsMock.mockImplementation(() => Promise.resolve([...assets]))
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
      expect(screen.getByText('最终效果预览')).toBeTruthy()
    })

    const previewCard = screen.getByText('最终效果预览').closest('div')
    expect(previewCard).toBeTruthy()

    const previewScope = within(previewCard!)
    expect(previewScope.getByText('苏砚')).toBeTruthy()
    expect(previewScope.getByText('冷静')).toBeTruthy()
    expect(screen.queryByText(/"_schema"/)).toBeNull()
    expect(screen.queryByRole('heading', { name: '编辑资产' })).toBeNull()
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
      expect(screen.getByRole('heading', { name: '编辑资产' })).toBeTruthy()
    })

    expect(screen.getByDisplayValue('主角人设')).toBeTruthy()
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
