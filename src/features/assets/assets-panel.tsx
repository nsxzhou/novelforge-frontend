import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, FilePenLine, Square, Trash2 } from 'lucide-react'
import { createAsset, deleteAsset, generateAssetStream, listAssets, updateAsset } from '@/shared/api/assets'
import type { AssetGenerationResponse } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import type { Asset, AssetType } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { StreamingText } from '@/shared/ui/streaming-text'
import { getErrorMessage } from '@/shared/lib/error-message'
import { StructuredAssetEditor } from './components/structured-asset-editor'
import { AssetContentDisplay } from './components/asset-content-display'

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

const defaultAssetValue: AssetFormValue = { type: 'outline', title: '', content: '' }
const defaultGenerateValue: GenerateFormValue = { type: 'character', instruction: '' }

type AssetEditorMode = { type: 'create' } | { type: 'edit'; asset: Asset }

function getAssetTypeLabel(type: AssetType): string {
  switch (type) {
    case 'worldbuilding': return '世界观'
    case 'character': return '角色'
    case 'outline': return '大纲'
    default: return type
  }
}

export function AssetsPanel({ projectId }: { projectId: string }) {
  const [filterType, setFilterType] = useState<'all' | AssetType>('all')
  const [editorMode, setEditorMode] = useState<AssetEditorMode>({ type: 'create' })
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [generationResult, setGenerationResult] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(projectId, filterType),
    queryFn: () => listAssets({ projectId, type: filterType === 'all' ? undefined : filterType, limit: 100, offset: 0 }),
  })

  const assetForm = useForm<AssetFormValue>({ resolver: zodResolver(assetSchema), defaultValues: defaultAssetValue })
  const generateForm = useForm<GenerateFormValue>({ resolver: zodResolver(generateSchema), defaultValues: defaultGenerateValue })
  const watchedType = assetForm.watch('type')
  const supportsStructured = watchedType === 'character' || watchedType === 'worldbuilding'

  const refreshAssets = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, filterType) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, 'all') })
  }, [queryClient, projectId, filterType])

  const createMutation = useMutation({
    mutationFn: (input: AssetFormValue) => createAsset(projectId, input),
    onSuccess: async () => { await refreshAssets(); assetForm.reset(defaultAssetValue); setEditorMode({ type: 'create' }); setError(null) },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: AssetFormValue }) => updateAsset(assetId, input),
    onSuccess: async () => { await refreshAssets(); assetForm.reset(defaultAssetValue); setEditorMode({ type: 'create' }); setError(null) },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: async () => { await refreshAssets(); setError(null) },
    onError: (e) => setError(getErrorMessage(e)),
  })

  function handleGenerateSubmit(value: GenerateFormValue) {
    setStreamingContent(''); setIsStreaming(true); setError(null); setGenerationResult(null)
    abortRef.current = new AbortController()
    generateAssetStream(projectId, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (result: AssetGenerationResponse) => {
        setIsStreaming(false)
        setGenerationResult(`生成成功：${result.asset.title}，耗时 ${result.generation_record.duration_millis} ms`)
        generateForm.reset(defaultGenerateValue); await refreshAssets()
      },
      onError: (errMsg: string) => { setIsStreaming(false); setError(errMsg) },
    }, abortRef.current.signal)
  }

  function cancelGeneration() { abortRef.current?.abort(); setIsStreaming(false) }

  const sortedAssets = useMemo(() => [...(assetsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [assetsQuery.data])
  const isAssetSubmitting = createMutation.isPending || updateMutation.isPending

  function handleAssetSubmit(value: AssetFormValue) {
    if (editorMode.type === 'edit') { updateMutation.mutate({ assetId: editorMode.asset.id, input: value }); return }
    createMutation.mutate(value)
  }

  function handleEdit(asset: Asset) {
    setEditorMode({ type: 'edit', asset })
    assetForm.reset({ type: asset.type, title: asset.title, content: asset.content })
  }

  function handleCancelEdit() { setEditorMode({ type: 'create' }); assetForm.reset(defaultAssetValue); setError(null) }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="Assets" title={editorMode.type === 'create' ? '资产创建' : '资产编辑'} description="支持世界观、角色、大纲三类资产。" />
          <form className="space-y-3" onSubmit={assetForm.handleSubmit(handleAssetSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">资产类型</label>
              <Select {...assetForm.register('type')}><option value="worldbuilding">世界观</option><option value="character">角色</option><option value="outline">大纲</option></Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">资产标题</label>
              <Input {...assetForm.register('title')} placeholder="例如：主角背景" />
              {assetForm.formState.errors.title ? <p className="mt-1 text-xs font-medium text-red-600">{assetForm.formState.errors.title.message}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">资产内容</label>
              {supportsStructured ? (
                <StructuredAssetEditor
                  assetType={watchedType}
                  content={assetForm.getValues('content')}
                  onChange={(val) => assetForm.setValue('content', val, { shouldValidate: true })}
                />
              ) : (
                <Textarea rows={6} {...assetForm.register('content')} placeholder="资产正文内容" />
              )}
              {assetForm.formState.errors.content ? <p className="mt-1 text-xs font-medium text-red-600">{assetForm.formState.errors.content.message}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={isAssetSubmitting}>{editorMode.type === 'create' ? '保存资产' : '更新资产'}</Button>
              {editorMode.type === 'edit' ? <Button type="button" variant="secondary" size="sm" onClick={handleCancelEdit}>取消编辑</Button> : null}
            </div>
          </form>
        </Card>

        <Card>
          <SectionTitle eyebrow="AI Generate" title="AI 资产生成" description="输入指令后流式生成资产内容。" />
          <form className="space-y-3" onSubmit={generateForm.handleSubmit(handleGenerateSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">目标类型</label>
              <Select {...generateForm.register('type')}><option value="worldbuilding">世界观</option><option value="character">角色</option><option value="outline">大纲</option></Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">生成要求</label>
              <Textarea rows={4} {...generateForm.register('instruction')} placeholder="描述你希望生成的资产内容" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isStreaming}><Bot className="mr-1 h-4 w-4" />发起生成</Button>
              {isStreaming ? <Button type="button" variant="danger" size="sm" onClick={cancelGeneration}><Square className="mr-1 h-4 w-4" />取消</Button> : null}
            </div>
          </form>
          {isStreaming ? (
            <article className="mt-3 rounded-xl border border-accent/20 bg-accent/5 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">AI 生成中</p>
              <StreamingText content={streamingContent} isStreaming={isStreaming} />
            </article>
          ) : null}
          {generationResult && !isStreaming ? <p className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-700">{generationResult}</p> : null}
        </Card>
      </div>

      <Card>
        <SectionTitle eyebrow="Library" title="设定工坊资产列表" description="支持过滤、编辑、删除。" action={
          <Select className="w-[180px]" value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | AssetType)}>
            <option value="all">全部类型</option><option value="worldbuilding">世界观</option><option value="character">角色</option><option value="outline">大纲</option>
          </Select>
        } />
        {assetsQuery.isLoading ? <LoadingState text="正在加载资产..." /> : null}
        {assetsQuery.error ? <ErrorState text={getErrorMessage(assetsQuery.error)} /> : null}
        {error ? <ErrorState text={error} /> : null}
        {sortedAssets.length === 0 && !assetsQuery.isLoading ? <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">当前没有资产，先在左侧创建或生成。</p> : null}
        <div className="space-y-3">
          {sortedAssets.map((asset) => (
            <Card key={asset.id} interactive padding="md">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{asset.title}</h3>
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />{getAssetTypeLabel(asset.type)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(asset)}><FilePenLine className="mr-1 h-4 w-4" />编辑</Button>
                  <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(asset.id)}><Trash2 className="mr-1 h-4 w-4" />删除</Button>
                </div>
              </div>
              <AssetContentDisplay content={asset.content} assetType={asset.type} />
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}
