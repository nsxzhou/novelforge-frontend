import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, FilePenLine, Square, Trash2, Plus, Boxes, Clock, ArrowUpCircle, WandSparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { createAsset, deleteAsset, generateAssetStream, listAllAssets, refineAssetStream, updateAsset } from '@/shared/api/assets'
import type { AssetGenerationResponse } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import { invalidateProjectAssets } from '@/shared/api/query-invalidation'
import type { Asset, AssetType } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Select, Textarea, FormField } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { Badge } from '@/shared/ui/badge'
import { Tabs } from '@/shared/ui/tabs'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants } from '@/shared/lib/motion'
import { formatRelativeTime } from '@/shared/lib/format'
import { StructuredAssetEditor } from './components/structured-asset-editor'
import { AssetContentDisplay } from './components/asset-content-display'
import { AssetEditorDrawer } from './components/asset-editor-drawer'
import { OutlineTreeView } from './components/outline-tree-view'
import {
  ASSET_TYPE_TO_SCHEMA,
  detectContentFormat,
  parseStructuredContent,
  serializeStructuredContent,
} from './schemas/asset-content'
import type { OutlineData } from './schemas/outline-schema'

const assetSchema = z.object({
  type: z.enum(['worldbuilding', 'character', 'outline']),
  title: z.string().trim().min(1, '请填写资产标题'),
  content: z.string().trim().min(1, '请填写资产内容'),
})

const generateSchema = z.object({
  type: z.enum(['worldbuilding', 'character', 'outline']),
  instruction: z.string().trim().min(1, '请填写生成要求'),
})

const refineSchema = z.object({
  instruction: z.string().trim().min(1, '请填写优化要求'),
})

type AssetFormValue = z.infer<typeof assetSchema>
type GenerateFormValue = z.infer<typeof generateSchema>
type RefineFormValue = z.infer<typeof refineSchema>

const defaultAssetValue: AssetFormValue = { type: 'outline', title: '', content: '' }
const defaultGenerateValue: GenerateFormValue = { type: 'character', instruction: '' }
const defaultRefineValue: RefineFormValue = { instruction: '' }

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

type FilterType = 'all' | AssetType

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'worldbuilding', label: '🌍 世界观' },
  { key: 'character', label: '👤 角色' },
  { key: 'outline', label: '📋 大纲' },
]

export function AssetsPanel({ projectId }: { projectId: string }) {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [editorMode, setEditorMode] = useState<AssetEditorMode>({ type: 'closed' })
  const [showGenerate, setShowGenerate] = useState(false)
  const [refineTarget, setRefineTarget] = useState<Asset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [generatedAssetPreview, setGeneratedAssetPreview] = useState<Asset | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const outlineSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const assetsQueryKey = filterType === 'all'
    ? queryKeys.assetsAll(projectId, 'all')
    : queryKeys.assets(projectId, filterType)

  const assetsQuery = useQuery({
    queryKey: assetsQueryKey,
    queryFn: () => listAllAssets({ projectId, type: filterType === 'all' ? undefined : filterType }),
  })

  const allAssetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAllAssets({ projectId }),
    enabled: filterType !== 'all',
  })

  const assetForm = useForm<AssetFormValue>({ resolver: zodResolver(assetSchema), defaultValues: defaultAssetValue })
  const generateForm = useForm<GenerateFormValue>({ resolver: zodResolver(generateSchema), defaultValues: defaultGenerateValue })
  const refineForm = useForm<RefineFormValue>({ resolver: zodResolver(refineSchema), defaultValues: defaultRefineValue })
  const watchedType = assetForm.watch('type')
  const supportsStructured = watchedType in ASSET_TYPE_TO_SCHEMA
  const isAssetDirty = assetForm.formState.isDirty

  // Outline data parsing for tree view (1C)
  const outlineAsset = useMemo(
    () => ((filterType === 'all' ? assetsQuery.data : allAssetsQuery.data) ?? []).find((asset) => asset.type === 'outline') ?? null,
    [allAssetsQuery.data, assetsQuery.data, filterType],
  )

  const outlineIsStructured = useMemo(() => {
    if (!outlineAsset) return false
    return outlineAsset.content_schema === 'outline_v2'
      || detectContentFormat(outlineAsset.content, 'outline') === 'structured'
  }, [outlineAsset])

  const outlineParsedData = useMemo(() => {
    if (!outlineAsset || !outlineIsStructured) return null
    return parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
  }, [outlineAsset, outlineIsStructured])

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

    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    setRefineTarget(null)
    refineForm.reset(defaultRefineValue)
    resetAssetEditor(nextMode)
    setShowGenerate(false)
    setError(null)
  }

  function closeGeneratePanel() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    setShowGenerate(false)
    setError(null)
    generateForm.reset(defaultGenerateValue)
  }

  function closeRefinePanel() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setRefineTarget(null)
    setError(null)
    refineForm.reset(defaultRefineValue)
  }

  function openGeneratePanel() {
    if (showForm && !confirmDiscardDraft()) return

    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    setRefineTarget(null)
    refineForm.reset(defaultRefineValue)
    resetAssetEditor({ type: 'closed' })
    generateForm.reset(defaultGenerateValue)
    setError(null)
    setShowGenerate(true)
  }

  function openRefinePanel(asset: Asset) {
    if (showForm && !confirmDiscardDraft()) return

    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    setShowGenerate(false)
    resetAssetEditor({ type: 'closed' })
    setRefineTarget(asset)
    refineForm.reset(defaultRefineValue)
    setError(null)
  }

  const refreshAssets = useCallback(async () => {
    await invalidateProjectAssets(queryClient, projectId, [assetsQueryKey])
  }, [assetsQueryKey, projectId, queryClient])

  const createMutation = useMutation({
    mutationFn: createAsset.bind(null, projectId),
    onSuccess: async () => {
      await refreshAssets()
      resetAssetEditor({ type: 'closed' })
      setError(null)
      toast('资产已创建')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: Parameters<typeof updateAsset>[1] }) => updateAsset(assetId, input),
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

  // Debounced save for outline tree view edits (1C)
  function handleOutlineTreeChange(data: OutlineData) {
    if (!outlineAsset) return
    if (outlineSaveTimerRef.current) clearTimeout(outlineSaveTimerRef.current)
    outlineSaveTimerRef.current = setTimeout(() => {
      const serialized = serializeStructuredContent(data)
      updateAsset(outlineAsset.id, { content: serialized, type: 'outline', title: outlineAsset.title })
        .then(() => refreshAssets())
        .catch((e) => toast(getErrorMessage(e), 'error'))
    }, 800)
  }

  function handleGenerateSubmit(value: GenerateFormValue) {
    setIsStreaming(true)
    setError(null)
    setGeneratedAssetPreview(null)
    abortRef.current = new AbortController()
    generateAssetStream(projectId, value, {
      onContent: () => {},
      onDone: async (result: AssetGenerationResponse) => {
        abortRef.current = null
        setIsStreaming(false)
        setGeneratedAssetPreview(result.asset)
        generateForm.reset(defaultGenerateValue)
        await refreshAssets()
        toast('AI 资产已生成，可先预览再决定是否编辑')
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setGeneratedAssetPreview(null)
        setError(errMsg)
      },
    }, abortRef.current.signal)
  }

  function cancelGeneration() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setError(null)
  }

  function handleEditGeneratedAsset() {
    if (!generatedAssetPreview) return
    openAssetEditor({ type: 'edit', asset: generatedAssetPreview })
  }

  function handleGenerateAgain() {
    setGeneratedAssetPreview(null)
    setError(null)
    generateForm.reset(defaultGenerateValue)
  }

  function handleRefineSubmit(value: RefineFormValue) {
    if (!refineTarget) return

    setIsStreaming(true)
    setError(null)
    abortRef.current = new AbortController()
    refineAssetStream(refineTarget.id, value, {
      onContent: () => {},
      onDone: async () => {
        abortRef.current = null
        setIsStreaming(false)
        setRefineTarget(null)
        refineForm.reset(defaultRefineValue)
        await refreshAssets()
        toast('AI 资产已优化')
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setError(errMsg)
      },
    }, abortRef.current.signal)
  }

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

  function handleCreateAsset() {
    if (outlineAsset) {
      openAssetEditor({ type: 'edit', asset: outlineAsset })
      return
    }
    openAssetEditor({ type: 'create' })
  }

  function handleCancelEdit() {
    if (!confirmDiscardDraft()) return
    resetAssetEditor({ type: 'closed' })
    setError(null)
  }

  const showForm = editorMode.type !== 'closed'

  // Determine if we should show the outline tree view (1C)
  const showOutlineTree = filterType === 'outline' && outlineIsStructured && outlineParsedData !== null
  const showOutlineUpgradeHint = filterType === 'outline' && outlineAsset && !outlineIsStructured

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (showGenerate) {
                closeGeneratePanel()
                return
              }
              openGeneratePanel()
            }}
            leftIcon={<Bot className="h-3.5 w-3.5" />}
          >
            AI 生成
          </Button>
          <Button
            size="sm"
            onClick={handleCreateAsset}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            {outlineAsset ? '编辑大纲' : '手动创建'}
          </Button>
        </div>
      </div>

      {/* Tab filter (1A) */}
      <Tabs
        id="asset-filter"
        tabs={filterTabs}
        activeKey={filterType}
        onChange={setFilterType}
      />

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
              <Button type="button" variant="ghost" size="sm" onClick={closeGeneratePanel}>关闭</Button>
            </div>
          </form>
          {error && <ErrorState text={error} className="mt-4" />}
          {isStreaming && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-muted p-4">
              <LoadingState text="AI 正在整理最终资产预览..." className="w-full justify-center border-0 bg-transparent px-0 py-0 text-foreground" />
              <p className="mt-2 text-center text-xs text-muted-foreground">生成完成后将在此处直接展示最终效果。</p>
            </div>
          )}
          {generatedAssetPreview && !isStreaming && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">生成完成</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base">{typeIcons[generatedAssetPreview.type]}</span>
                    <h4 className="text-sm font-semibold text-foreground">{generatedAssetPreview.title}</h4>
                    <Badge variant="success">{typeLabels[generatedAssetPreview.type]}</Badge>
                  </div>
                  <p className="text-sm text-emerald-700">以下为最终效果预览，可确认后再进入编辑。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={handleEditGeneratedAsset} leftIcon={<FilePenLine className="h-3.5 w-3.5" />}>
                    编辑资产
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={handleGenerateAgain}>
                    继续生成
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={closeGeneratePanel}>
                    关闭
                  </Button>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-white/80 bg-white p-4">
                <p className="mb-2 text-xs font-medium text-foreground">最终效果预览</p>
                <AssetContentDisplay content={generatedAssetPreview.content} assetType={generatedAssetPreview.type} />
              </div>
            </div>
          )}
        </Card>
      )}

      {refineTarget && (
        <Card>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-foreground">AI 资产优化</h3>
              <p className="text-sm text-muted-foreground">当前资产：{refineTarget.title}</p>
            </div>
            <Badge variant="default">{typeLabels[refineTarget.type]}</Badge>
          </div>
          <form className="space-y-4" onSubmit={refineForm.handleSubmit(handleRefineSubmit)}>
            <FormField label="优化要求" error={refineForm.formState.errors.instruction?.message}>
              <Textarea rows={3} {...refineForm.register('instruction')} placeholder="描述你希望 AI 优化的方向，例如补充细节、强化人物动机、梳理结构" />
            </FormField>
            <div className="flex gap-2">
              <Button type="submit" disabled={isStreaming} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                开始优化
              </Button>
              {isStreaming ? (
                <Button type="button" variant="danger" size="sm" onClick={cancelGeneration} leftIcon={<Square className="h-3.5 w-3.5" />}>
                  取消
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={closeRefinePanel}>
                关闭
              </Button>
            </div>
          </form>
          {error && <ErrorState text={error} className="mt-4" />}
          {isStreaming && (
            <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-muted p-4">
              <LoadingState text="AI 正在优化资产..." className="w-full justify-center border-0 bg-transparent px-0 py-0 text-foreground" />
              <p className="mt-2 text-center text-xs text-muted-foreground">优化完成后会自动刷新资产列表。</p>
            </div>
          )}
        </Card>
      )}

      {/* Outline tree view (1C) */}
      {showOutlineTree && (
        <OutlineTreeView
          defaultValues={outlineParsedData}
          onChange={handleOutlineTreeChange}
        />
      )}

      {/* Outline upgrade hint (1C) */}
      {showOutlineUpgradeHint && (
        <Card padding="md">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ArrowUpCircle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">当前大纲为纯文本格式</p>
              <p className="mt-0.5">升级为结构化大纲后可使用文件树导航编辑。点击大纲卡片进入编辑后，选择结构化模式即可升级。</p>
            </div>
          </div>
        </Card>
      )}

      {/* Asset list (hidden when outline tree is shown) */}
      {!showOutlineTree && (
        <>
          {assetsQuery.isLoading && <LoadingState text="正在加载资产..." />}
          {assetsQuery.error && <ErrorState text={getErrorMessage(assetsQuery.error)} />}
          {error && !showForm && !showGenerate && !refineTarget && <ErrorState text={error} />}

          {sortedAssets.length === 0 && !assetsQuery.isLoading ? (
            <EmptyState
              icon={<Boxes className="h-6 w-6" />}
              title="暂无设定资产"
              description="创建世界观、角色或大纲来丰富你的故事"
              action={
                <Button size="sm" onClick={handleCreateAsset} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  {outlineAsset ? '编辑大纲' : '创建资产'}
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
                        <Button variant="ghost" size="sm" onClick={() => openRefinePanel(asset)} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                          AI 优化
                        </Button>
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
        </>
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

      {/* Editor drawer (1B) */}
      <AssetEditorDrawer
        open={showForm}
        onClose={handleCancelEdit}
        title={editorMode.type === 'create' ? '创建资产' : '编辑资产'}
      >
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
      </AssetEditorDrawer>
    </div>
  )
}
