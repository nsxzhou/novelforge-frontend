import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, FilePenLine, Square, Trash2, Plus, Filter, Boxes, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { createAsset, deleteAsset, generateAssetStream, listAssets, updateAsset } from '@/shared/api/assets'
import type { AssetGenerationResponse } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import type { Asset, AssetType } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Select, Textarea, FormField } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { StreamingText } from '@/shared/ui/streaming-text'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/shared/ui/dropdown'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants } from '@/shared/lib/motion'
import { formatRelativeTime } from '@/shared/lib/format'
import { StructuredAssetEditor } from './components/structured-asset-editor'
import { AssetContentDisplay } from './components/asset-content-display'
import { ASSET_TYPE_TO_SCHEMA } from './schemas/asset-content'

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

type AssetEditorMode = { type: 'closed' } | { type: 'create' } | { type: 'edit'; asset: Asset }

const typeLabels: Record<AssetType, string> = {
  worldbuilding: '世界观',
  character: '角色',
  outline: '大纲',
}

const typeIcons: Record<AssetType, string> = {
  worldbuilding: '🌍',
  character: '👤',
  outline: '📋',
}

export function AssetsPanel({ projectId }: { projectId: string }) {
  const [filterType, setFilterType] = useState<'all' | AssetType>('all')
  const [editorMode, setEditorMode] = useState<AssetEditorMode>({ type: 'closed' })
  const [showGenerate, setShowGenerate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [generationResult, setGenerationResult] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(projectId, filterType),
    queryFn: () => listAssets({ projectId, type: filterType === 'all' ? undefined : filterType, limit: 100, offset: 0 }),
  })

  const assetForm = useForm<AssetFormValue>({ resolver: zodResolver(assetSchema), defaultValues: defaultAssetValue })
  const generateForm = useForm<GenerateFormValue>({ resolver: zodResolver(generateSchema), defaultValues: defaultGenerateValue })
  const watchedType = assetForm.watch('type')
  const supportsStructured = watchedType in ASSET_TYPE_TO_SCHEMA
  const isAssetDirty = assetForm.formState.isDirty

  function resetAssetEditor(nextMode: AssetEditorMode) {
    setEditorMode(nextMode)
    if (nextMode.type === 'edit') {
      assetForm.reset({
        type: nextMode.asset.type,
        title: nextMode.asset.title,
        content: nextMode.asset.content,
      })
      return
    }

    assetForm.reset(defaultAssetValue)
  }

  function confirmDiscardDraft() {
    if (!isAssetDirty) return true
    return window.confirm('当前资产编辑尚未保存，确认放弃这些更改并切换目标吗？')
  }

  function openAssetEditor(nextMode: AssetEditorMode) {
    if (!confirmDiscardDraft()) return

    resetAssetEditor(nextMode)
    setShowGenerate(false)
    setError(null)
  }

  const refreshAssets = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, filterType) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, 'all') })
    await queryClient.invalidateQueries({ queryKey: queryKeys.assetsAll(projectId, 'all') })
    await queryClient.invalidateQueries({ queryKey: queryKeys.assetsAll(projectId, 'character') })
  }, [queryClient, projectId, filterType])

  const createMutation = useMutation({
    mutationFn: (input: AssetFormValue & { content_schema?: string }) => createAsset(projectId, input),
    onSuccess: async () => {
      await refreshAssets()
      resetAssetEditor({ type: 'closed' })
      setError(null)
      toast('资产已创建')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: AssetFormValue & { content_schema?: string } }) => updateAsset(assetId, input),
    onSuccess: async () => {
      await refreshAssets()
      resetAssetEditor({ type: 'closed' })
      setError(null)
      toast('资产已更新')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const deleteMutation = useMutation({
    mutationFn: (assetId: string) => deleteAsset(assetId),
    onSuccess: async () => {
      await refreshAssets()
      setDeleteTarget(null)
      setError(null)
      toast('资产已删除')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  function handleGenerateSubmit(value: GenerateFormValue) {
    setStreamingContent(''); setIsStreaming(true); setError(null); setGenerationResult(null)
    abortRef.current = new AbortController()
    generateAssetStream(projectId, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (result: AssetGenerationResponse) => {
        setIsStreaming(false)
        setGenerationResult(`生成成功：${result.asset.title}，已打开编辑面板供预览`)
        generateForm.reset(defaultGenerateValue)
        setShowGenerate(false)
        await refreshAssets()
        // 自动打开编辑面板，让用户预览和修改 AI 生成的资产
        resetAssetEditor({ type: 'edit', asset: result.asset })
        toast('AI 资产已生成，请预览确认')
      },
      onError: (errMsg: string) => { setIsStreaming(false); setError(errMsg) },
    }, abortRef.current.signal)
  }

  function cancelGeneration() { abortRef.current?.abort(); setIsStreaming(false) }

  const sortedAssets = useMemo(() => [...(assetsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [assetsQuery.data])
  const isAssetSubmitting = createMutation.isPending || updateMutation.isPending

  function handleAssetSubmit(value: AssetFormValue) {
    const payload = {
      ...value,
      content_schema: supportsStructured ? ASSET_TYPE_TO_SCHEMA[value.type] : undefined,
    }
    if (editorMode.type === 'edit') {
      updateMutation.mutate({ assetId: editorMode.asset.id, input: payload })
      return
    }
    createMutation.mutate(payload)
  }

  function handleEdit(asset: Asset) {
    openAssetEditor({ type: 'edit', asset })
  }

  function handleCancelEdit() {
    if (!confirmDiscardDraft()) return
    resetAssetEditor({ type: 'closed' })
    setError(null)
  }

  const showForm = editorMode.type !== 'closed'

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle
          eyebrow="Assets"
          title="设定工坊"
          description="管理世界观、角色、大纲等设定资产"
          className="mb-0"
        />
        <div className="flex items-center gap-2">
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm" leftIcon={<Filter className="h-3.5 w-3.5" />}>
                {filterType === 'all' ? '全部类型' : typeLabels[filterType]}
              </Button>
            }
          >
            <DropdownItem onClick={() => setFilterType('all')}>全部类型</DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => setFilterType('worldbuilding')}>🌍 世界观</DropdownItem>
            <DropdownItem onClick={() => setFilterType('character')}>👤 角色</DropdownItem>
            <DropdownItem onClick={() => setFilterType('outline')}>📋 大纲</DropdownItem>
          </Dropdown>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!showGenerate && showForm && !confirmDiscardDraft()) return
              if (!showGenerate) {
                resetAssetEditor({ type: 'closed' })
              }
              setShowGenerate((v) => !v)
            }}
            leftIcon={<Bot className="h-3.5 w-3.5" />}
          >
            AI 生成
          </Button>
          <Button
            size="sm"
            onClick={() => openAssetEditor({ type: 'create' })}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            手动创建
          </Button>
        </div>
      </div>

      {/* AI Generation panel */}
      {showGenerate && (
        <Card>
          <h3 className="text-sm font-medium text-foreground mb-4">AI 资产生成</h3>
          <form className="space-y-4" onSubmit={generateForm.handleSubmit(handleGenerateSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="目标类型">
                <Select {...generateForm.register('type')}>
                  <option value="worldbuilding">世界观</option>
                  <option value="character">角色</option>
                  <option value="outline">大纲</option>
                </Select>
              </FormField>
            </div>
            <FormField label="生成要求">
              <Textarea rows={3} {...generateForm.register('instruction')} placeholder="描述你希望生成的资产内容" />
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" disabled={isStreaming} leftIcon={<Bot className="h-3.5 w-3.5" />}>发起生成</Button>
              {isStreaming && <Button type="button" variant="danger" size="sm" onClick={cancelGeneration} leftIcon={<Square className="h-3.5 w-3.5" />}>取消</Button>}
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowGenerate(false)}>关闭</Button>
            </div>
          </form>
          {isStreaming && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-muted p-4">
              <p className="mb-2 text-xs font-medium text-foreground">AI 生成中</p>
              <StreamingText content={streamingContent} isStreaming={isStreaming} />
            </div>
          )}
          {generationResult && !isStreaming && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{generationResult}</p>
          )}
        </Card>
      )}

      {/* Create/Edit form panel */}
      {showForm && (
        <Card>
          <h3 className="text-sm font-medium text-foreground mb-4">
            {editorMode.type === 'create' ? '创建资产' : '编辑资产'}
          </h3>
          <form className="space-y-4" onSubmit={assetForm.handleSubmit(handleAssetSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="资产类型">
                <Select {...assetForm.register('type')}>
                  <option value="worldbuilding">世界观</option>
                  <option value="character">角色</option>
                  <option value="outline">大纲</option>
                </Select>
              </FormField>
              <FormField label="资产标题" error={assetForm.formState.errors.title?.message}>
                <Input {...assetForm.register('title')} placeholder="例如：主角背景" />
              </FormField>
            </div>
            <FormField label="资产内容" error={assetForm.formState.errors.content?.message}>
              {supportsStructured ? (
                <StructuredAssetEditor
                  assetType={watchedType}
                  content={assetForm.getValues('content')}
                  onChange={(val) => assetForm.setValue('content', val, { shouldDirty: true, shouldValidate: true })}
                />
              ) : (
                <Textarea rows={6} {...assetForm.register('content')} placeholder="资产正文内容" />
              )}
            </FormField>
            {error && <ErrorState text={error} />}
            <div className="flex gap-2">
              <Button type="submit" loading={isAssetSubmitting}>
                {editorMode.type === 'create' ? '保存资产' : '更新资产'}
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancelEdit}>取消</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Asset list */}
      {assetsQuery.isLoading && <LoadingState text="正在加载资产..." />}
      {assetsQuery.error && <ErrorState text={getErrorMessage(assetsQuery.error)} />}
      {error && !showForm && !showGenerate && <ErrorState text={error} />}

      {sortedAssets.length === 0 && !assetsQuery.isLoading ? (
        <EmptyState
          icon={<Boxes className="h-6 w-6" />}
          title="暂无设定资产"
          description="创建世界观、角色或大纲来丰富你的故事"
          action={
            <Button size="sm" onClick={() => openAssetEditor({ type: 'create' })} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              创建资产
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.staggerChildren}
          className="space-y-3"
        >
          {sortedAssets.map((asset) => (
            <motion.div key={asset.id} variants={variants.fadeInUp} transition={{ duration: 0.15 }}>
              <Card padding="md" interactive onClick={() => handleEdit(asset)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-base">{typeIcons[asset.type]}</span>
                      <h3 className="text-sm font-medium tracking-tight text-foreground truncate">
                        {asset.title}
                      </h3>
                      <Badge variant="default">{typeLabels[asset.type]}</Badge>
                    </div>
                    <div className="mb-2">
                      <AssetContentDisplay content={asset.content} assetType={asset.type} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(asset.updated_at)}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(asset)} leftIcon={<FilePenLine className="h-3.5 w-3.5" />}>
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(asset)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Delete dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除资产"
        description={`确定要删除「${deleteTarget?.title}」吗？此操作不可撤销。`}
        size="sm"
      >
        {deleteMutation.error && <ErrorState text={getErrorMessage(deleteMutation.error)} />}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            确认删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
