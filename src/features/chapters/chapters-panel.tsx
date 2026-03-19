import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, RefreshCcw, Save, Square, WandSparkles,
  Plus, BookOpen, FileText, AlignLeft, Undo2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { listAssets } from '@/shared/api/assets'
import {
  confirmChapter,
  unconfirmChapter,
  createChapterStream,
  continueChapterStream,
  getChapter,
  listChapters,
  rewriteChapterStream,
  updateChapter,
} from '@/shared/api/chapters'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import type { Chapter } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Select, Textarea, FormField } from '@/shared/ui/input'
import { StreamingText } from '@/shared/ui/streaming-text'
import { Badge } from '@/shared/ui/badge'
import { Tabs } from '@/shared/ui/tabs'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants } from '@/shared/lib/motion'
import { cn } from '@/shared/lib/cn'
import { wordCount } from '@/shared/lib/format'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { TiptapEditor, type TextSelection } from './components/tiptap-editor'
import { RewritePopover } from './components/rewrite-popover'

const createSchema = z.object({
  ordinal: z.coerce.number().int().min(1, '请选择章节计划'),
  instruction: z.string().trim().min(1, '请填写创作要求'),
})

const continueSchema = z.object({
  instruction: z.string().trim().min(1, '请填写续写要求'),
})

const rewriteSchema = z.object({
  target_text: z.string().trim().min(1, '请填写要改写的原文'),
  instruction: z.string().trim().min(1, '请填写改写要求'),
})

type CreateFormValue = z.infer<typeof createSchema>
type ContinueFormValue = z.infer<typeof continueSchema>
type RewriteFormValue = z.infer<typeof rewriteSchema>

type AITab = 'continue' | 'rewrite'

type ChaptersPanelProps = {
  projectId: string
  selectedChapterId?: string | null
  onSelectedChapterChange?: (chapterId: string | null) => void
}

export function ChaptersPanel({
  projectId,
  selectedChapterId: controlledSelectedChapterId,
  onSelectedChapterChange,
}: ChaptersPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [internalSelectedChapterId, setInternalSelectedChapterId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [operationResult, setOperationResult] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [aiTab, setAITab] = useState<AITab>('continue')
  const abortRef = useRef<AbortController | null>(null)

  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [showRewritePopover, setShowRewritePopover] = useState(false)

  const selectedChapterId = controlledSelectedChapterId ?? internalSelectedChapterId

  const setSelectedChapterId = useCallback((chapterId: string | null) => {
    onSelectedChapterChange?.(chapterId)
    if (controlledSelectedChapterId === undefined) {
      setInternalSelectedChapterId(chapterId)
    }
  }, [controlledSelectedChapterId, onSelectedChapterChange])

  const [ghostTextOn, setGhostTextOn] = useState(
    () => localStorage.getItem('ghostTextEnabled') !== 'false',
  )
  function toggleGhostText() {
    setGhostTextOn((prev) => {
      const next = !prev
      localStorage.setItem('ghostTextEnabled', String(next))
      return next
    })
  }

  const createForm = useForm<CreateFormValue>({
    resolver: zodResolver(createSchema),
    defaultValues: { ordinal: 1, instruction: '' },
  })

  const continueForm = useForm<ContinueFormValue>({
    resolver: zodResolver(continueSchema),
    defaultValues: { instruction: '' },
  })

  const rewriteForm = useForm<RewriteFormValue>({
    resolver: zodResolver(rewriteSchema),
    defaultValues: { target_text: '', instruction: '' },
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chapters(projectId),
    queryFn: () => listChapters(projectId, 100, 0),
  })

  const assetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAssets({ projectId, limit: 100, offset: 0 }),
  })

  const chapterDetailQuery = useQuery({
    queryKey: queryKeys.chapter(selectedChapterId ?? ''),
    queryFn: () => getChapter(selectedChapterId as string),
    enabled: Boolean(selectedChapterId),
  })

  const refreshChapters = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.chapters(projectId) })
    await queryClient.invalidateQueries({ queryKey: queryKeys.chaptersAll(projectId) })
    if (selectedChapterId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.chapter(selectedChapterId) })
    }
  }, [queryClient, projectId, selectedChapterId])

  const startStream = useCallback(() => {
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    setOperationResult(null)
    abortRef.current = new AbortController()
  }, [])

  const makeCallbacks = useCallback(
    (onDoneExtra?: (result: ChapterGenerationResponse) => void) => ({
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (result: ChapterGenerationResponse) => {
        abortRef.current = null
        setIsStreaming(false)
        setSelectedChapterId(result.chapter.id)
        setEditedContent(null)
        setOperationResult(`完成，耗时 ${result.generation_record.duration_millis} ms`)
        onDoneExtra?.(result)
        await refreshChapters()
        toast('操作完成')
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setError(errMsg)
      },
    }),
    [refreshChapters, setSelectedChapterId, toast],
  )

  function cancelStream() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }

  function handleCreateSubmit(value: CreateFormValue) {
    startStream()
    setShowCreateDialog(false)
    createChapterStream(projectId, value, makeCallbacks(() => {
      const nextOrdinal = unwrittenPlannedChapters.find((chapter) => chapter.ordinal !== value.ordinal)?.ordinal ?? value.ordinal
      createForm.reset({ ordinal: nextOrdinal, instruction: '' })
    }), abortRef.current!.signal)
  }

  function handleContinueSubmit(value: ContinueFormValue) {
    if (!selectedChapterId) { setError('请先选择章节。'); return }
    startStream()
    continueChapterStream(selectedChapterId, value, makeCallbacks(() => {
      continueForm.reset({ instruction: '' })
    }), abortRef.current!.signal)
  }

  function handleRewriteSubmit(value: RewriteFormValue) {
    if (!selectedChapterId) { setError('请先选择章节。'); return }
    startStream()
    rewriteChapterStream(selectedChapterId, value, makeCallbacks(() => {
      rewriteForm.reset({ target_text: '', instruction: '' })
    }), abortRef.current!.signal)
  }

  const confirmMutation = useMutation({
    mutationFn: (chapterId: string) => confirmChapter(chapterId),
    onSuccess: async (chapter) => {
      setSelectedChapterId(chapter.id)
      setOperationResult('当前稿已确认')
      setError(null)
      await refreshChapters()
      toast('章节已确认')
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const unconfirmMutation = useMutation({
    mutationFn: (chapterId: string) => unconfirmChapter(chapterId),
    onSuccess: async (chapter) => {
      setSelectedChapterId(chapter.id)
      setEditedContent(null)
      setOperationResult('已取消确认，可继续编辑')
      setError(null)
      await refreshChapters()
      toast('已取消确认')
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const saveMutation = useMutation({
    mutationFn: ({ chapterId, content }: { chapterId: string; content: string }) =>
      updateChapter(chapterId, { content }),
    onSuccess: async () => {
      setEditedContent(null)
      setOperationResult('内容已保存')
      setError(null)
      await refreshChapters()
      toast('已保存')
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const selectedChapter: Chapter | null = chapterDetailQuery.data ?? null
  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
  )
  const outlineData = useMemo(() => {
    const outlineAsset = (assetsQuery.data ?? []).find((asset) => asset.type === 'outline')
    if (!outlineAsset) return null
    return parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
  }, [assetsQuery.data])
  const outlineAssetExists = useMemo(
    () => (assetsQuery.data ?? []).some((asset) => asset.type === 'outline'),
    [assetsQuery.data],
  )
  const plannedChapters = useMemo(
    () => flattenOutlineChapters(outlineData),
    [outlineData],
  )
  const unwrittenPlannedChapters = useMemo(
    () => plannedChapters.filter((planned) => !chapters.some((chapter) => chapter.ordinal === planned.ordinal)),
    [plannedChapters, chapters],
  )
  const selectedPlannedOrdinal = createForm.watch('ordinal')

  const isDraft = selectedChapter?.status === 'draft'
  const hasUnsavedChanges = editedContent !== null && editedContent !== selectedChapter?.content

  function handleContentChange(plainText: string) { setEditedContent(plainText) }
  function handleSelectionChange(sel: TextSelection | null) { setSelection(sel) }
  function handleSave() {
    if (!selectedChapterId || editedContent === null) return
    saveMutation.mutate({ chapterId: selectedChapterId, content: editedContent })
  }

  function handleRewriteComplete(result: ChapterGenerationResponse) {
    setShowRewritePopover(false)
    setSelection(null)
    setEditedContent(null)
    setSelectedChapterId(result.chapter.id)
    setOperationResult(`改写完成，耗时 ${result.generation_record.duration_millis} ms`)
    refreshChapters()
  }

  useEffect(() => {
    if (!isStreaming) return

    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
    setStreamingContent('')
    setOperationResult(null)
    setError(null)
  }, [isStreaming, selectedChapterId])

  useEffect(() => {
    setEditedContent(null)
    setSelection(null)
    setShowRewritePopover(false)
  }, [selectedChapterId])

  useEffect(() => {
    if (showCreateDialog && unwrittenPlannedChapters.length > 0) {
      createForm.setValue('ordinal', unwrittenPlannedChapters[0].ordinal)
    }
  }, [createForm, showCreateDialog, unwrittenPlannedChapters])

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Left: Chapter list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">章节列表</h3>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            disabled={unwrittenPlannedChapters.length === 0}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            新章节
          </Button>
        </div>

        {chaptersQuery.isLoading && <LoadingState text="加载章节中..." />}
        {chaptersQuery.error && <ErrorState text={getErrorMessage(chaptersQuery.error)} />}

        <motion.div initial="hidden" animate="visible" variants={variants.staggerChildren} className="space-y-1.5">
          {chapters.map((chapter) => {
            const isActive = selectedChapterId === chapter.id
            const isConfirmed = chapter.status === 'confirmed'
            return (
              <motion.button
                key={chapter.id}
                variants={variants.fadeInUp}
                type="button"
                onClick={() => {
                  setSelectedChapterId(chapter.id)
                  setEditedContent(null)
                  setSelection(null)
                  setShowRewritePopover(false)
                }}
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                  isActive
                    ? 'bg-card border-l-[3px] border-l-[#0F172A] border border-border'
                    : 'hover:bg-muted border border-transparent',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium tracking-tight truncate">
                    第{chapter.ordinal}章 · {chapter.title}
                  </p>
                  <Badge variant={isConfirmed ? 'success' : 'warning'} className="text-[10px] shrink-0">
                    {isConfirmed ? '已确认' : '草稿'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {wordCount(chapter.content)} 字
                </p>
              </motion.button>
            )
          })}
        </motion.div>

        {chapters.length === 0 && !chaptersQuery.isLoading && (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="暂无章节"
            description={
              unwrittenPlannedChapters.length > 0
                ? '从大纲计划中选择章节开始创作'
                : outlineAssetExists
                  ? '当前大纲结构无效或未规划章节，请先修复分卷制大纲。'
                  : '请先创建大纲并规划章节'
            }
            className="py-8"
          />
        )}
      </div>

      {/* Right: Chapter detail */}
      <div className="space-y-4">
        {error && <ErrorState text={error} />}
        {operationResult && !isStreaming && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            {operationResult}
          </div>
        )}

        {/* Streaming output */}
        {isStreaming && (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-foreground">AI 生成中</span>
              <Button variant="danger" size="sm" onClick={cancelStream} leftIcon={<Square className="h-3.5 w-3.5" />}>
                取消
              </Button>
            </div>
            <StreamingText content={streamingContent} isStreaming={isStreaming} />
          </Card>
        )}

        {!selectedChapterId && !isStreaming && (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="选择一个章节"
            description="从左侧列表选择章节以查看和编辑"
          />
        )}

        {selectedChapter && !isStreaming && (
          <>
            {/* Editor card */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium tracking-tight">{selectedChapter.title}</h3>
                  <Badge variant={selectedChapter.status === 'confirmed' ? 'success' : 'warning'}>
                    {selectedChapter.status === 'confirmed' ? '已确认' : '草稿'}
                  </Badge>
                  {hasUnsavedChanges && <Badge variant="warning">未保存</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && isDraft && (
                    <Button variant="secondary" size="sm" loading={saveMutation.isPending} onClick={handleSave} leftIcon={<Save className="h-3.5 w-3.5" />}>
                      保存
                    </Button>
                  )}
                  {isDraft ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={confirmMutation.isPending}
                      disabled={hasUnsavedChanges}
                      title={hasUnsavedChanges ? '请先保存编辑内容' : undefined}
                      onClick={() => confirmMutation.mutate(selectedChapter.id)}
                      leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    >
                      确认当前稿
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={unconfirmMutation.isPending}
                      onClick={() => unconfirmMutation.mutate(selectedChapter.id)}
                      leftIcon={<Undo2 className="h-3.5 w-3.5" />}
                    >
                      取消确认
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-white p-4">
                <TiptapEditor
                  key={selectedChapter.id}
                  content={selectedChapter.content}
                  readOnly={!isDraft}
                  chapterId={selectedChapterId ?? undefined}
                  ghostTextEnabled={isDraft && ghostTextOn}
                  onToggleGhostText={isDraft ? toggleGhostText : undefined}
                  onContentChange={handleContentChange}
                  onSelectionChange={handleSelectionChange}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span><AlignLeft className="inline h-3 w-3 mr-1" />{wordCount(editedContent ?? selectedChapter.content)} 字</span>
                <div className="flex items-center gap-4">
                  {isDraft && (
                    <span className="text-slate-300">输入后稍候，AI 将自动提供续写建议（Tab 接受 / Esc 取消）</span>
                  )}
                  {selectedChapter.current_draft_confirmed_at && (
                    <span className="text-emerald-600">已确认于 {selectedChapter.current_draft_confirmed_at}</span>
                  )}
                </div>
              </div>
            </Card>

            {/* Selection rewrite popover */}
            {selection && isDraft && !showRewritePopover && (
              <div className="animate-fade-in-up">
                <Button variant="secondary" size="sm" onClick={() => setShowRewritePopover(true)} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                  改写选中文本
                </Button>
              </div>
            )}

            {showRewritePopover && selection && selectedChapterId && (
              <RewritePopover
                chapterId={selectedChapterId}
                selectedText={selection.text}
                onClose={() => setShowRewritePopover(false)}
                onComplete={handleRewriteComplete}
              />
            )}

            {/* AI operations */}
            <Card>
              <Tabs
                tabs={[
                  { key: 'continue' as const, label: '续写', icon: <RefreshCcw className="h-3.5 w-3.5" /> },
                  { key: 'rewrite' as const, label: '改写', icon: <WandSparkles className="h-3.5 w-3.5" /> },
                ]}
                activeKey={aiTab}
                onChange={setAITab}
              />

              <div className="mt-4">
                {aiTab === 'continue' && (
                  <form className="space-y-3" onSubmit={continueForm.handleSubmit(handleContinueSubmit)}>
                    <FormField label="续写要求">
                      <Textarea rows={3} {...continueForm.register('instruction')} placeholder="输入续写要求" />
                    </FormField>
                    <Button type="submit" size="sm" disabled={isStreaming} leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}>
                      执行续写
                    </Button>
                  </form>
                )}
                {aiTab === 'rewrite' && (
                  <form className="space-y-3" onSubmit={rewriteForm.handleSubmit(handleRewriteSubmit)}>
                    <FormField label="要改写的原文">
                      <Textarea rows={2} {...rewriteForm.register('target_text')} placeholder="粘贴需要改写的原文" />
                    </FormField>
                    <FormField label="改写要求">
                      <Textarea rows={2} {...rewriteForm.register('instruction')} placeholder="描述改写要求" />
                    </FormField>
                    <Button type="submit" size="sm" disabled={isStreaming} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                      执行改写
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </>
        )}

        {chapterDetailQuery.isLoading && !isStreaming && <LoadingState text="加载章节详情..." />}
        {chapterDetailQuery.error && !isStreaming && <ErrorState text={getErrorMessage(chapterDetailQuery.error)} />}
      </div>

      {/* Create chapter dialog */}
      <Dialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        title="生成新章节"
        description={unwrittenPlannedChapters.length > 0 ? '从大纲计划中选择尚未写作的章节，再补充本章创作要求。' : '请先在大纲中规划章节，随后按计划生成正文。'}
      >
        <form className="space-y-4" onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
          <FormField
            label="章节计划"
            error={createForm.formState.errors.ordinal?.message}
            description={unwrittenPlannedChapters.length > 0 ? '标题由大纲计划提供，生成时按所选章节序号创建。' : undefined}
          >
            <Select
              {...createForm.register('ordinal')}
              disabled={unwrittenPlannedChapters.length === 0}
            >
              {unwrittenPlannedChapters.length === 0 ? (
                <option value="0">暂无可写章节</option>
              ) : null}
              {unwrittenPlannedChapters.map((chapter) => (
                <option key={chapter.ordinal} value={chapter.ordinal}>
                  第{chapter.ordinal}章 · {chapter.title || '未命名章节'}
                </option>
              ))}
            </Select>
          </FormField>
          {unwrittenPlannedChapters.length > 0 ? (
            <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-muted-foreground">
              {(() => {
                const selectedPlannedChapter = unwrittenPlannedChapters.find(
                  (chapter) => chapter.ordinal === Number(selectedPlannedOrdinal),
                ) ?? unwrittenPlannedChapters[0]
                return selectedPlannedChapter?.summary ? selectedPlannedChapter.summary : '该章节暂无摘要，可直接用创作要求补充细节。'
              })()}
            </div>
          ) : null}
          <FormField label="创作要求" error={createForm.formState.errors.instruction?.message}>
            <Textarea rows={4} {...createForm.register('instruction')} placeholder="描述本章生成要求，例如视角、节奏、重点冲突" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button type="submit" disabled={isStreaming || unwrittenPlannedChapters.length === 0} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>生成章节</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
