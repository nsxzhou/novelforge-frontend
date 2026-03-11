import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, FilePenLine, Trash2 } from 'lucide-react'
import {
  createAsset,
  deleteAsset,
  generateAsset,
  listAssets,
  updateAsset,
} from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import type { Asset, AssetType, GenerationRecord } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { getErrorMessage } from '@/shared/lib/error-message'

const assetSchema = z.object({
  type: z.enum(['worldbuilding', 'character', 'outline']),
  title: z.string().trim().min(1, '请填写资产标题'),
  content: z.string().trim().min(1, '请填写资产内容'),
})

const generateSchema = z.object({
  type: z.enum(['worldbuilding', 'character', 'outline']),
  instruction: z.string().trim().min(1, '请填写生成要求'),
})

type AssetFormValue = z.infer<typeof assetSchema>
type GenerateFormValue = z.infer<typeof generateSchema>

const defaultAssetValue: AssetFormValue = {
  type: 'outline',
  title: '',
  content: '',
}

const defaultGenerateValue: GenerateFormValue = {
  type: 'character',
  instruction: '',
}

type AssetEditorMode =
  | { type: 'create' }
  | {
      type: 'edit'
      asset: Asset
    }

type GenerationDisplayState = 'idle' | 'running' | 'succeeded' | 'failed'

type GenerationFeedback = {
  status: GenerationRecord['status']
  recordId?: string
  durationMillis?: number
  assetTitle?: string
  errorMessage?: string
}

function getAssetTypeLabel(type: AssetType): string {
  switch (type) {
    case 'worldbuilding':
      return '世界观'
    case 'character':
      return '角色'
    case 'outline':
      return '大纲'
    default:
      return type
  }
}

function toGenerationDisplayState(status: GenerationRecord['status']): GenerationDisplayState {
  switch (status) {
    case 'failed':
      return 'failed'
    case 'pending':
    case 'running':
      return 'running'
    case 'succeeded':
      return 'succeeded'
    default:
      return 'idle'
  }
}

function getGenerationStateMeta(state: GenerationDisplayState): {
  label: string
  className: string
} {
  switch (state) {
    case 'running':
      return { label: '生成中', className: 'bg-blue-50 text-blue-700' }
    case 'succeeded':
      return { label: '生成成功', className: 'bg-green-50 text-green-700' }
    case 'failed':
      return { label: '生成失败', className: 'bg-red-50 text-red-700' }
    default:
      return { label: '未开始', className: 'bg-muted text-gray-700' }
  }
}

export function AssetsPanel({ projectId }: { projectId: string }) {
  const [filterType, setFilterType] = useState<'all' | AssetType>('all')
  const [editorMode, setEditorMode] = useState<AssetEditorMode>({ type: 'create' })
  const [error, setError] = useState<string | null>(null)
  const [generationState, setGenerationState] = useState<GenerationDisplayState>('idle')
  const [generationFeedback, setGenerationFeedback] = useState<GenerationFeedback | null>(null)
  const queryClient = useQueryClient()

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(projectId, filterType),
    queryFn: () =>
      listAssets({
        projectId,
        type: filterType === 'all' ? undefined : filterType,
        limit: 100,
        offset: 0,
      }),
  })

  const assetForm = useForm<AssetFormValue>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaultAssetValue,
  })

  const generateForm = useForm<GenerateFormValue>({
    resolver: zodResolver(generateSchema),
    defaultValues: defaultGenerateValue,
  })

  const refreshAssets = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, filterType) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, 'all') })
  }

  const createMutation = useMutation({
    mutationFn: (input: AssetFormValue) => createAsset(projectId, input),
    onSuccess: async () => {
      await refreshAssets()
      assetForm.reset(defaultAssetValue)
      setEditorMode({ type: 'create' })
      setError(null)
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: AssetFormValue }) =>
      updateAsset(assetId, input),
    onSuccess: async () => {
      await refreshAssets()
      assetForm.reset(defaultAssetValue)
      setEditorMode({ type: 'create' })
      setError(null)
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: async () => {
      await refreshAssets()
      setError(null)
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const generateMutation = useMutation({
    mutationFn: (input: GenerateFormValue) => generateAsset(projectId, input),
    onMutate: () => {
      setError(null)
      setGenerationState('running')
      // 发起新一轮生成前清空旧结果，避免状态信息混淆。
      setGenerationFeedback({
        status: 'running',
      })
    },
    onSuccess: async (result) => {
      await refreshAssets()
      generateForm.reset(defaultGenerateValue)
      setGenerationState(toGenerationDisplayState(result.generation_record.status))
      setGenerationFeedback({
        status: result.generation_record.status,
        recordId: result.generation_record.id,
        durationMillis: result.generation_record.duration_millis,
        assetTitle: result.asset.title,
        errorMessage: result.generation_record.error_message || undefined,
      })
      setError(null)
    },
    onError: (mutationError) => {
      const message = getErrorMessage(mutationError)
      setError(message)
      setGenerationState('failed')
      setGenerationFeedback({
        status: 'failed',
        errorMessage: message,
      })
    },
  })

  const sortedAssets = useMemo(() => {
    return [...(assetsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [assetsQuery.data])
  const generationStateMeta = getGenerationStateMeta(generationState)

  const isAssetSubmitting = createMutation.isPending || updateMutation.isPending

  function handleAssetSubmit(value: AssetFormValue) {
    if (editorMode.type === 'edit') {
      updateMutation.mutate({ assetId: editorMode.asset.id, input: value })
      return
    }
    createMutation.mutate(value)
  }

  function handleEdit(asset: Asset) {
    setEditorMode({ type: 'edit', asset })
    assetForm.reset({
      type: asset.type,
      title: asset.title,
      content: asset.content,
    })
  }

  function handleCancelEdit() {
    setEditorMode({ type: 'create' })
    assetForm.reset(defaultAssetValue)
    setError(null)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card tone="green">
          <SectionTitle
            title={editorMode.type === 'create' ? '资产创建' : '资产编辑'}
            description="支持世界观、角色、大纲三类资产。"
          />

          <form className="space-y-3" onSubmit={assetForm.handleSubmit(handleAssetSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold">资产类型</label>
              <Select {...assetForm.register('type')}>
                <option value="worldbuilding">世界观</option>
                <option value="character">角色</option>
                <option value="outline">大纲</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">资产标题</label>
              <Input {...assetForm.register('title')} placeholder="例如：主角背景" />
              {assetForm.formState.errors.title ? (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {assetForm.formState.errors.title.message}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">资产内容</label>
              <Textarea rows={6} {...assetForm.register('content')} placeholder="资产正文内容" />
              {assetForm.formState.errors.content ? (
                <p className="mt-1 text-xs font-medium text-red-600">
                  {assetForm.formState.errors.content.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isAssetSubmitting}>
                {editorMode.type === 'create' ? '保存资产' : '更新资产'}
              </Button>
              {editorMode.type === 'edit' ? (
                <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                  取消编辑
                </Button>
              ) : null}
            </div>
          </form>
        </Card>

        <Card tone="amber">
          <SectionTitle title="AI 资产生成" description="输入指令后自动创建资产并返回生成记录。" />

          <form className="space-y-3" onSubmit={generateForm.handleSubmit((v) => generateMutation.mutate(v))}>
            <div>
              <label className="mb-1 block text-sm font-semibold">目标类型</label>
              <Select {...generateForm.register('type')}>
                <option value="worldbuilding">世界观</option>
                <option value="character">角色</option>
                <option value="outline">大纲</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">生成要求</label>
              <Textarea rows={4} {...generateForm.register('instruction')} placeholder="描述你希望生成的资产内容" />
            </div>
            <Button type="submit" loading={generateMutation.isPending}>
              <Bot className="mr-1 h-4 w-4" />
              发起生成
            </Button>
          </form>

          {generationState !== 'idle' ? (
            <article className={`mt-3 rounded-md p-3 text-sm ${generationStateMeta.className}`}>
              <p className="font-semibold">{generationStateMeta.label}</p>
              {generationFeedback?.status ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide">
                  generation_record.status: {generationFeedback.status}
                </p>
              ) : null}
              {generationFeedback?.assetTitle ? <p className="mt-1">资产标题：{generationFeedback.assetTitle}</p> : null}
              {generationFeedback?.recordId ? (
                <p className="mt-1 break-all text-xs">记录 ID：{generationFeedback.recordId}</p>
              ) : null}
              {typeof generationFeedback?.durationMillis === 'number' ? (
                <p className="mt-1">耗时：{generationFeedback.durationMillis} ms</p>
              ) : null}
              {generationFeedback?.errorMessage ? <p className="mt-1">失败原因：{generationFeedback.errorMessage}</p> : null}
            </article>
          ) : null}
        </Card>
      </div>

      <Card tone="default">
        <SectionTitle
          title="设定工坊资产列表"
          description="支持过滤、编辑、删除。"
          action={
            <Select
              className="w-[180px]"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as 'all' | AssetType)}
            >
              <option value="all">全部类型</option>
              <option value="worldbuilding">世界观</option>
              <option value="character">角色</option>
              <option value="outline">大纲</option>
            </Select>
          }
        />

        {assetsQuery.isLoading ? <LoadingState text="正在加载资产..." /> : null}
        {assetsQuery.error ? <ErrorState text={getErrorMessage(assetsQuery.error)} /> : null}
        {error ? <ErrorState text={error} /> : null}

        {sortedAssets.length === 0 && !assetsQuery.isLoading ? (
          <p className="rounded-md bg-muted p-4 text-sm text-gray-600">当前没有资产，先在左侧创建或生成。</p>
        ) : null}

        <div className="space-y-3">
          {sortedAssets.map((asset) => (
            <article
              key={asset.id}
              className="group rounded-lg bg-muted p-4 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold tracking-tight">{asset.title}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    {getAssetTypeLabel(asset.type)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="h-10 px-3 text-xs"
                    onClick={() => handleEdit(asset)}
                  >
                    <FilePenLine className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    variant="danger"
                    className="h-10 px-3 text-xs"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(asset.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{asset.content}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
