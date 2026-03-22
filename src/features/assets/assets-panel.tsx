import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, FilePenLine, Square, Trash2, Plus, Boxes, Clock, ArrowUpCircle, WandSparkles, Check, X, RotateCcw } from 'lucide-react'
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
  // Inline editing: 'new' for create, asset.id for edit, null for none
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null)
  // AI Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  // AI Refine modal
  const [showRefineModal, setShowRefineModal] = useState(false)
  const [refineTarget, setRefineTarget] = useState<Asset | null>(null)
  const [refineOriginalSnapshot, setRefineOriginalSnapshot] = useState<Asset | null>(null)
  const [refinedPreview, setRefinedPreview] = useState<Asset | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [generatedAssetPreview, setGeneratedAssetPreview] = useState<Asset[] | null>(null)
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

  // Outline data parsing for tree view
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

  function confirmDiscardDraft() {
    if (!isAssetDirty) return true
    return window.confirm('当前资产编辑尚未保存，确认放弃这些更改并切换目标吗？')
  }

  function startEditing(asset: Asset) {
    if (editingAssetId && !confirmDiscardDraft()) return
    setEditingAssetId(asset.id)
    assetForm.reset({
      type: asset.type,
      title: asset.title,
      content: asset.content,
    })
    setError(null)
  }

  function startCreating() {
    if (editingAssetId && !confirmDiscardDraft()) return
    setEditingAssetId('new')
    assetForm.reset(defaultAssetValue)
    setError(null)
  }

  function cancelEditing() {
    if (!confirmDiscardDraft()) return
    setEditingAssetId(null)
    assetForm.reset(defaultAssetValue)
    setError(null)
  }

  const refreshAssets = useCallback(async () => {
    await invalidateProjectAssets(queryClient, projectId, [assetsQueryKey])
  }, [assetsQueryKey, projectId, queryClient])

  const createMutation = useMutation({
    mutationFn: createAsset.bind(null, projectId),
    onSuccess: async () => {
      await refreshAssets()
      setEditingAssetId(null)
      assetForm.reset(defaultAssetValue)
      setError(null)
      toast('资产已创建')
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ assetId, input }: { assetId: string; input: Parameters<typeof updateAsset>[1] }) => updateAsset(assetId, input),
    onSuccess: async () => {
      await refreshAssets()
      setEditingAssetId(null)
      assetForm.reset(defaultAssetValue)
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

  // Debounced save for outline tree view edits
  function handleOutlineTreeChange(data: OutlineData) {
    if (!outlineAsset) return
    if (outlineSaveTimerRef.current) clearTimeout(outlineSaveTimerRef.current)
    outlineSaveTimerRef.current = setTimeout(() => {
      const serialized = serializeStructuredContent(data)
      updateAsset(outlineAsset.id, {
        content: serialized,
        type: 'outline',
        title: outlineAsset.title,
        content_schema: outlineAsset.content_schema,
      })
        .then(() => refreshAssets())
        .catch((e) => toast(getErrorMessage(e), 'error'))
    }, 800)
  }

  // --- AI Generate Modal ---

  function openGenerateModal() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    // If outline already exists, default to 'character' instead of allowing 'outline'
    generateForm.reset(outlineAsset ? { ...defaultGenerateValue, type: 'character' } : defaultGenerateValue)
    setError(null)
    setShowGenerateModal(true)
  }

  function closeGenerateModal() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setGeneratedAssetPreview(null)
    setShowGenerateModal(false)
    setError(null)
    generateForm.reset(defaultGenerateValue)
  }

  function handleGenerateSubmit(value: GenerateFormValue) {
    setIsStreaming(true)
    setError(null)
    setGeneratedAssetPreview(null)
    abortRef.current = new AbortController()
    generateAssetStream(projectId, value, {
      onContent: () => { },
      onDone: async (result: AssetGenerationResponse) => {
        abortRef.current = null
        setIsStreaming(false)
        setGeneratedAssetPreview(result.assets)
        generateForm.reset(defaultGenerateValue)
        await refreshAssets()
        toast(`AI 已生成 ${result.assets.length} 个资产，可先预览再决定是否编辑`)
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setGeneratedAssetPreview(null)
        setError(errMsg)
      },
    }, abortRef.current.signal)
  }

  function handleEditGeneratedAsset() {
    if (!generatedAssetPreview || generatedAssetPreview.length === 0) return
    const first = generatedAssetPreview[0]
    closeGenerateModal()
    startEditing(first)
  }

  function handleGenerateAgain() {
    setGeneratedAssetPreview(null)
    setError(null)
    generateForm.reset(defaultGenerateValue)
  }

  // --- AI Refine Modal ---

  function openRefineModal(asset: Asset) {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setRefineTarget(asset)
    setRefineOriginalSnapshot({ ...asset })
    setRefinedPreview(null)
    refineForm.reset(defaultRefineValue)
    setError(null)
    setShowRefineModal(true)
  }

  function closeRefineModal() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setShowRefineModal(false)
    setRefineTarget(null)
    setRefineOriginalSnapshot(null)
    setRefinedPreview(null)
    setError(null)
    refineForm.reset(defaultRefineValue)
  }

  function handleRefineSubmit(value: RefineFormValue) {
    if (!refineTarget) return

    setIsStreaming(true)
    setError(null)
    setRefinedPreview(null)
    abortRef.current = new AbortController()
    refineAssetStream(refineTarget.id, value, {
      onContent: () => { },
      onDone: async (result: AssetGenerationResponse) => {
        abortRef.current = null
        setIsStreaming(false)
        setRefinedPreview(result.assets[0])
        refineForm.reset(defaultRefineValue)
        await refreshAssets()
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setError(errMsg)
      },
    }, abortRef.current.signal)
  }

  async function handleApplyRefine() {
    closeRefineModal()
    toast('AI 优化已应用')
  }

  async function handleDiscardRefine() {
    if (!refineOriginalSnapshot) {
      closeRefineModal()
      return
    }
    try {
      await updateAsset(refineOriginalSnapshot.id, {
        type: refineOriginalSnapshot.type,
        title: refineOriginalSnapshot.title,
        content: refineOriginalSnapshot.content,
        content_schema: refineOriginalSnapshot.content_schema || undefined,
      })
      await refreshAssets()
      toast('已放弃优化，资产已恢复原内容')
    } catch (e) {
      toast(getErrorMessage(e), 'error')
    }
    closeRefineModal()
  }

  function handleRefineAgain() {
    setRefinedPreview(null)
    setError(null)
    refineForm.reset(defaultRefineValue)
  }

  function cancelStreaming() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setError(null)
  }

  // --- Asset submit ---

  const sortedAssets = useMemo(() => [...(assetsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [assetsQuery.data])
  const isAssetSubmitting = createMutation.isPending || updateMutation.isPending

  function handleAssetSubmit(value: AssetFormValue) {
    const payload = {
      ...value,
      content_schema: supportsStructured ? ASSET_TYPE_TO_SCHEMA[value.type] : undefined,
    }
    if (editingAssetId && editingAssetId !== 'new') {
      updateMutation.mutate({ assetId: editingAssetId, input: payload })
      return
    }
    createMutation.mutate(payload)
  }

  function handleCreateAsset() {
    if (outlineAsset) {
      startEditing(outlineAsset)
      return
    }
    startCreating()
  }

  // Determine if we should show the outline tree view
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
            onClick={openGenerateModal}
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

      {/* Tab filter */}
      <Tabs
        id="asset-filter"
        tabs={filterTabs}
        activeKey={filterType}
        onChange={setFilterType}
      />

      {/* Outline tree view */}
      {showOutlineTree && (
        <OutlineTreeView
          defaultValues={outlineParsedData}
          onChange={handleOutlineTreeChange}
          onRefineOutline={() => outlineAsset && openRefineModal(outlineAsset)}
        />
      )}

      {/* Outline upgrade hint */}
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

      {/* Asset list with inline editing */}
      {!showOutlineTree && (
        <>
          {assetsQuery.isLoading && <LoadingState text="正在加载资产..." />}
          {assetsQuery.error && <ErrorState text={getErrorMessage(assetsQuery.error)} />}
          {error && !editingAssetId && !showGenerateModal && !showRefineModal && <ErrorState text={error} />}

          {/* Inline create form at top of list */}
          {editingAssetId === 'new' && (
            <Card padding="md">
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
                {error && editingAssetId === 'new' && <ErrorState text={error} />}
                <div className="flex gap-2">
                  <Button type="submit" loading={isAssetSubmitting} leftIcon={<Check className="h-3.5 w-3.5" />}>
                    保存资产
                  </Button>
                  <Button type="button" variant="ghost" onClick={cancelEditing} leftIcon={<X className="h-3.5 w-3.5" />}>
                    取消
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {sortedAssets.length === 0 && !assetsQuery.isLoading && editingAssetId !== 'new' ? (
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
                  {editingAssetId === asset.id ? (
                    /* Inline edit form */
                    <Card padding="md">
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
                        {error && editingAssetId === asset.id && <ErrorState text={error} />}
                        <div className="flex gap-2">
                          <Button type="submit" loading={isAssetSubmitting} leftIcon={<Check className="h-3.5 w-3.5" />}>
                            更新资产
                          </Button>
                          <Button type="button" variant="ghost" onClick={cancelEditing} leftIcon={<X className="h-3.5 w-3.5" />}>
                            取消
                          </Button>
                        </div>
                      </form>
                    </Card>
                  ) : (
                    /* Read-only asset card */
                    <Card padding="md" interactive onClick={() => startEditing(asset)}>
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
                          <Button variant="ghost" size="sm" onClick={() => openRefineModal(asset)} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                            AI 优化
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => startEditing(asset)} leftIcon={<FilePenLine className="h-3.5 w-3.5" />}>
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
                  )}
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

      {/* AI Generate Modal */}
      <Dialog
        open={showGenerateModal}
        onClose={() => { if (!isStreaming) closeGenerateModal() }}
        title="AI 资产生成"
        size="xl"
      >
        {!generatedAssetPreview ? (
          <>
            <form className="space-y-4" onSubmit={generateForm.handleSubmit(handleGenerateSubmit)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="目标类型">
                  <Select {...generateForm.register('type')}>
                    <option value="worldbuilding">世界观</option>
                    <option value="character">角色</option>
                    <option value="outline" disabled={!!outlineAsset}>大纲{outlineAsset ? '（已存在）' : ''}</option>
                  </Select>
                </FormField>
              </div>
              {outlineAsset && (
                <p className="text-xs text-amber-600">已有大纲资产，如需细化请使用"AI 优化"功能</p>
              )}
              <FormField label="生成要求">
                <Textarea rows={3} {...generateForm.register('instruction')} placeholder="描述你希望生成的资产内容" />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={isStreaming} leftIcon={<Bot className="h-3.5 w-3.5" />}>发起生成</Button>
                {isStreaming && <Button type="button" variant="danger" size="sm" onClick={cancelStreaming} leftIcon={<Square className="h-3.5 w-3.5" />}>取消</Button>}
                {!isStreaming && <Button type="button" variant="ghost" size="sm" onClick={closeGenerateModal}>关闭</Button>}
              </div>
            </form>
            {error && <ErrorState text={error} className="mt-4" />}
            {isStreaming && (
              <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-muted p-4">
                <LoadingState text="AI 正在整理最终资产预览..." className="w-full justify-center border-0 bg-transparent px-0 py-0 text-foreground" />
                <p className="mt-2 text-center text-xs text-muted-foreground">生成完成后将在此处直接展示最终效果。</p>
              </div>
            )}
          </>
        ) : (
          /* Generated asset preview */
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="space-y-1 mb-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-700">
                  生成完成 · {generatedAssetPreview.length} 个资产
                </p>
                <p className="text-sm text-emerald-700">以下为最终效果预览，可确认后再进入编辑。</p>
              </div>
              <div className="space-y-3">
                {generatedAssetPreview.map((asset) => (
                  <div key={asset.id} className="rounded-lg border border-white/80 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-base">{typeIcons[asset.type]}</span>
                      <h4 className="text-sm font-semibold text-foreground">{asset.title}</h4>
                      <Badge variant="success">{typeLabels[asset.type]}</Badge>
                    </div>
                    <AssetContentDisplay content={asset.content} assetType={asset.type} />
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={closeGenerateModal}>关闭</Button>
              <Button variant="secondary" size="sm" onClick={handleGenerateAgain}>继续生成</Button>
              {generatedAssetPreview.length === 1 ? (
                <Button size="sm" onClick={handleEditGeneratedAsset} leftIcon={<FilePenLine className="h-3.5 w-3.5" />}>
                  编辑资产
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        )}
      </Dialog>

      {/* AI Refine Modal */}
      <Dialog
        open={showRefineModal}
        onClose={() => { if (!isStreaming) closeRefineModal() }}
        title="AI 资产优化"
        description={refineTarget ? `当前资产：${refineTarget.title}` : undefined}
        size="xl"
      >
        {!refinedPreview ? (
          <>
            {refineTarget && (
              <div className="mb-4">
                <Badge variant="default">{typeLabels[refineTarget.type]}</Badge>
              </div>
            )}
            <form className="space-y-4" onSubmit={refineForm.handleSubmit(handleRefineSubmit)}>
              <FormField label="优化要求" error={refineForm.formState.errors.instruction?.message}>
                <Textarea rows={3} {...refineForm.register('instruction')} placeholder="描述你希望 AI 优化的方向，例如补充细节、强化人物动机、梳理结构" />
              </FormField>
              <div className="flex gap-2">
                <Button type="submit" disabled={isStreaming} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                  开始优化
                </Button>
                {isStreaming && (
                  <Button type="button" variant="danger" size="sm" onClick={cancelStreaming} leftIcon={<Square className="h-3.5 w-3.5" />}>
                    取消
                  </Button>
                )}
                {!isStreaming && <Button type="button" variant="ghost" size="sm" onClick={closeRefineModal}>关闭</Button>}
              </div>
            </form>
            {error && <ErrorState text={error} className="mt-4" />}
            {isStreaming && (
              <div className="mt-4 rounded-lg border border-[#E2E8F0] bg-muted p-4">
                <LoadingState text="AI 正在优化资产..." className="w-full justify-center border-0 bg-transparent px-0 py-0 text-foreground" />
                <p className="mt-2 text-center text-xs text-muted-foreground">优化完成后可在此预览结果。</p>
              </div>
            )}
          </>
        ) : (
          /* Refine preview with apply/discard */
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-emerald-700 mb-3">优化结果预览</p>
              <div className="rounded-lg border border-white/80 bg-white p-4">
                <AssetContentDisplay content={refinedPreview.content} assetType={refinedPreview.type} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={handleDiscardRefine} leftIcon={<X className="h-3.5 w-3.5" />}>
                放弃优化
              </Button>
              <Button variant="secondary" size="sm" onClick={handleRefineAgain} leftIcon={<RotateCcw className="h-3.5 w-3.5" />}>
                重新优化
              </Button>
              <Button size="sm" onClick={handleApplyRefine} leftIcon={<Check className="h-3.5 w-3.5" />}>
                应用优化
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  )
}
