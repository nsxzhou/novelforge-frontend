import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileClock, RefreshCcw, Square, WandSparkles } from 'lucide-react'
import {
  confirmChapter,
  createChapterStream,
  continueChapterStream,
  getChapter,
  listChapters,
  rewriteChapterStream,
} from '@/shared/api/chapters'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import type { Chapter } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { StreamingText } from '@/shared/ui/streaming-text'
import { getErrorMessage } from '@/shared/lib/error-message'

const createSchema = z.object({
  title: z.string().trim().min(1, '请填写章节标题'),
  ordinal: z.coerce.number().int().min(1, '序号必须 >= 1'),
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

export function ChaptersPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [operationResult, setOperationResult] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const createForm = useForm<CreateFormValue>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', ordinal: 1, instruction: '' },
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

  const chapterDetailQuery = useQuery({
    queryKey: queryKeys.chapter(selectedChapterId ?? ''),
    queryFn: () => getChapter(selectedChapterId as string),
    enabled: Boolean(selectedChapterId),
  })

  const refreshChapters = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.chapters(projectId) })
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
      onContent: (chunk: string) => {
        setStreamingContent((prev) => prev + chunk)
      },
      onDone: async (result: ChapterGenerationResponse) => {
        setIsStreaming(false)
        setSelectedChapterId(result.chapter.id)
        setOperationResult(`完成，耗时 ${result.generation_record.duration_millis} ms。`)
        onDoneExtra?.(result)
        await refreshChapters()
      },
      onError: (errMsg: string) => {
        setIsStreaming(false)
        setError(errMsg)
      },
    }),
    [refreshChapters],
  )

  function cancelStream() {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  function handleCreateSubmit(value: CreateFormValue) {
    startStream()
    createChapterStream(
      projectId,
      value,
      makeCallbacks((result) => {
        createForm.reset({ title: '', ordinal: result.chapter.ordinal + 1, instruction: '' })
      }),
      abortRef.current!.signal,
    )
  }

  function handleContinueSubmit(value: ContinueFormValue) {
    if (!selectedChapterId) {
      setError('请先选择章节。')
      return
    }
    startStream()
    continueChapterStream(
      selectedChapterId,
      value,
      makeCallbacks(() => {
        continueForm.reset({ instruction: '' })
      }),
      abortRef.current!.signal,
    )
  }

  function handleRewriteSubmit(value: RewriteFormValue) {
    if (!selectedChapterId) {
      setError('请先选择章节。')
      return
    }
    startStream()
    rewriteChapterStream(
      selectedChapterId,
      value,
      makeCallbacks(() => {
        rewriteForm.reset({ target_text: '', instruction: '' })
      }),
      abortRef.current!.signal,
    )
  }

  const confirmMutation = useMutation({
    mutationFn: (chapterId: string) => confirmChapter(chapterId),
    onSuccess: async (chapter) => {
      setSelectedChapterId(chapter.id)
      setOperationResult('当前稿已确认。')
      setError(null)
      await refreshChapters()
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const selectedChapter: Chapter | null = chapterDetailQuery.data ?? null
  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <SectionTitle eyebrow="Chapters" title="生成新章节" description="输入标题、序号和创作要求。" />

          <form className="space-y-3" onSubmit={createForm.handleSubmit(handleCreateSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold">章节标题</label>
              <Input {...createForm.register('title')} placeholder="例如：第一章 王城初见" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">章节序号</label>
              <Input type="number" min={1} {...createForm.register('ordinal')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold">创作要求</label>
              <Textarea rows={4} {...createForm.register('instruction')} placeholder="描述章节生成要求" />
            </div>
            <Button type="submit" disabled={isStreaming}>
              <WandSparkles className="mr-1 h-4 w-4" />
              生成章节
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle
            eyebrow="List"
            title="章节列表"
            description="可查看并选择章节做续写/改写/确认。"
          />
          {chaptersQuery.isLoading ? <LoadingState text="加载章节中..." /> : null}
          {chaptersQuery.error ? <ErrorState text={getErrorMessage(chaptersQuery.error)} /> : null}

          <div className="space-y-2">
            {chapters.map((chapter) => (
              <button
                key={chapter.id}
                type="button"
                onClick={() => setSelectedChapterId(chapter.id)}
                className="w-full rounded-md bg-muted px-3 py-2 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-muted"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight">
                    第 {chapter.ordinal} 章 · {chapter.title}
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {chapter.status === 'confirmed' ? '已确认' : '草稿'}
                  </span>
                </div>
              </button>
            ))}
            {chapters.length === 0 && !chaptersQuery.isLoading ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">暂无章节，请先生成。</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle
          eyebrow="Detail"
          title="章节详情与操作"
          description="支持续写、局部改写和当前稿确认。"
          action={
            <div className="flex gap-2">
              {isStreaming ? (
                <Button variant="danger" size="sm" onClick={cancelStream}>
                  <Square className="mr-1 h-4 w-4" />
                  取消生成
                </Button>
              ) : null}
              {selectedChapter && !isStreaming ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(selectedChapter.id)}
                >
                  <CheckCircle2 className="mr-1 h-4 w-4" />
                  确认当前稿
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <ErrorState text={error} /> : null}
        {operationResult && !isStreaming ? (
          <p className="mb-3 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{operationResult}</p>
        ) : null}

        {isStreaming ? (
          <article className="rounded-lg bg-accent/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">AI 生成中</p>
            <StreamingText content={streamingContent} isStreaming={isStreaming} />
          </article>
        ) : null}

        {!selectedChapterId && !isStreaming ? (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">请先从左侧选择章节。</p>
        ) : null}

        {selectedChapter && !isStreaming ? (
          <>
            <article className="rounded-lg bg-muted p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-extrabold tracking-tight">{selectedChapter.title}</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {selectedChapter.status === 'confirmed' ? '已确认' : '草稿'}
                </span>
              </div>

              {selectedChapter.current_draft_id ? (
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileClock className="h-4 w-4" />
                  current_draft_id: {selectedChapter.current_draft_id}
                </div>
              ) : null}

              {selectedChapter.current_draft_confirmed_at ? (
                <div className="mb-2 flex items-center gap-2 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  已确认于 {selectedChapter.current_draft_confirmed_at}
                </div>
              ) : null}

              <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{selectedChapter.content}</p>
            </article>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <form
                className="space-y-3 rounded-xl border border-accent/20 bg-accent/5 p-4"
                onSubmit={continueForm.handleSubmit(handleContinueSubmit)}
              >
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-accent">章节续写</h4>
                <Textarea rows={4} {...continueForm.register('instruction')} placeholder="输入续写要求" />
                <Button type="submit" disabled={isStreaming}>
                  <RefreshCcw className="mr-1 h-4 w-4" />
                  执行续写
                </Button>
              </form>

              <form
                className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-50 p-4"
                onSubmit={rewriteForm.handleSubmit(handleRewriteSubmit)}
              >
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-amber-600">局部改写</h4>
                <Textarea
                  rows={3}
                  {...rewriteForm.register('target_text')}
                  placeholder="粘贴需要改写的原文"
                />
                <Textarea rows={3} {...rewriteForm.register('instruction')} placeholder="描述改写要求" />
                <Button type="submit" disabled={isStreaming}>
                  <WandSparkles className="mr-1 h-4 w-4" />
                  执行改写
                </Button>
              </form>
            </div>
          </>
        ) : null}

        {chapterDetailQuery.isLoading && !isStreaming ? <LoadingState text="加载章节详情..." /> : null}
        {chapterDetailQuery.error && !isStreaming ? <ErrorState text={getErrorMessage(chapterDetailQuery.error)} /> : null}
      </Card>
    </div>
  )
}
