import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, FileClock, RefreshCcw, WandSparkles } from 'lucide-react'
import {
  confirmChapter,
  continueChapter,
  createChapter,
  getChapter,
  listChapters,
  rewriteChapter,
} from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import type { Chapter } from '@/shared/api/types'
import { getUserId } from '@/shared/lib/user-id'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
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

  const createForm = useForm<CreateFormValue>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      title: '',
      ordinal: 1,
      instruction: '',
    },
  })

  const continueForm = useForm<ContinueFormValue>({
    resolver: zodResolver(continueSchema),
    defaultValues: { instruction: '' },
  })

  const rewriteForm = useForm<RewriteFormValue>({
    resolver: zodResolver(rewriteSchema),
    defaultValues: {
      target_text: '',
      instruction: '',
    },
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

  const refreshChapters = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.chapters(projectId) })
    if (selectedChapterId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.chapter(selectedChapterId) })
    }
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateFormValue) => createChapter(projectId, input),
    onSuccess: async (result) => {
      setSelectedChapterId(result.chapter.id)
      createForm.reset({ title: '', ordinal: result.chapter.ordinal + 1, instruction: '' })
      setOperationResult(`章节已生成，耗时 ${result.generation_record.duration_millis} ms。`)
      setError(null)
      await refreshChapters()
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const continueMutation = useMutation({
    mutationFn: ({ chapterId, input }: { chapterId: string; input: ContinueFormValue }) =>
      continueChapter(chapterId, input),
    onSuccess: async (result) => {
      setSelectedChapterId(result.chapter.id)
      continueForm.reset({ instruction: '' })
      setOperationResult(`续写完成，耗时 ${result.generation_record.duration_millis} ms。`)
      setError(null)
      await refreshChapters()
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const rewriteMutation = useMutation({
    mutationFn: ({ chapterId, input }: { chapterId: string; input: RewriteFormValue }) =>
      rewriteChapter(chapterId, input),
    onSuccess: async (result) => {
      setSelectedChapterId(result.chapter.id)
      rewriteForm.reset({ target_text: '', instruction: '' })
      setOperationResult(`改写完成，耗时 ${result.generation_record.duration_millis} ms。`)
      setError(null)
      await refreshChapters()
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (chapterId: string) => confirmChapter(chapterId, getUserId()),
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

  function handleContinueSubmit(value: ContinueFormValue) {
    if (!selectedChapterId) {
      setError('请先选择章节。')
      return
    }
    continueMutation.mutate({ chapterId: selectedChapterId, input: value })
  }

  function handleRewriteSubmit(value: RewriteFormValue) {
    if (!selectedChapterId) {
      setError('请先选择章节。')
      return
    }
    rewriteMutation.mutate({ chapterId: selectedChapterId, input: value })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card tone="blue">
          <SectionTitle eyebrow="Chapters" title="生成新章节" description="输入标题、序号和创作要求。" />

          <form className="space-y-3" onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}>
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
            <Button type="submit" loading={createMutation.isPending}>
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
                className="w-full rounded-md bg-muted px-3 py-2 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-gray-200"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold tracking-tight">
                    第 {chapter.ordinal} 章 · {chapter.title}
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {chapter.status === 'confirmed' ? '已确认' : '草稿'}
                  </span>
                </div>
              </button>
            ))}
            {chapters.length === 0 && !chaptersQuery.isLoading ? (
              <p className="rounded-md bg-muted p-3 text-sm text-gray-600">暂无章节，请先生成。</p>
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
            selectedChapter ? (
              <Button
                variant="outline"
                size="sm"
                loading={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate(selectedChapter.id)}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" />
                确认当前稿
              </Button>
            ) : null
          }
        />

        {error ? <ErrorState text={error} /> : null}
        {operationResult ? (
          <p className="mb-3 rounded-md bg-green-50 p-3 text-sm font-semibold text-green-700">{operationResult}</p>
        ) : null}

        {!selectedChapterId ? (
          <p className="rounded-md bg-muted p-4 text-sm text-gray-600">请先从左侧选择章节。</p>
        ) : (
          <>
            {chapterDetailQuery.isLoading ? <LoadingState text="加载章节详情..." /> : null}
            {chapterDetailQuery.error ? <ErrorState text={getErrorMessage(chapterDetailQuery.error)} /> : null}

            {selectedChapter ? (
              <>
                <article className="rounded-lg bg-muted p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-extrabold tracking-tight">{selectedChapter.title}</h3>
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {selectedChapter.status === 'confirmed' ? '已确认' : '草稿'}
                    </span>
                  </div>

                  {selectedChapter.current_draft_id ? (
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-600">
                      <FileClock className="h-4 w-4" />
                      current_draft_id: {selectedChapter.current_draft_id}
                    </div>
                  ) : null}

                  {selectedChapter.current_draft_confirmed_at ? (
                    <div className="mb-2 flex items-center gap-2 text-xs text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      已确认于 {selectedChapter.current_draft_confirmed_at}
                    </div>
                  ) : null}

                  <p className="whitespace-pre-wrap text-sm leading-7 text-gray-800">{selectedChapter.content}</p>
                </article>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <form
                    className="space-y-3 rounded-lg bg-blue-50 p-4"
                    onSubmit={continueForm.handleSubmit(handleContinueSubmit)}
                  >
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-blue-700">章节续写</h4>
                    <Textarea rows={4} {...continueForm.register('instruction')} placeholder="输入续写要求" />
                    <Button type="submit" loading={continueMutation.isPending}>
                      <RefreshCcw className="mr-1 h-4 w-4" />
                      执行续写
                    </Button>
                  </form>

                  <form
                    className="space-y-3 rounded-lg bg-amber-50 p-4"
                    onSubmit={rewriteForm.handleSubmit(handleRewriteSubmit)}
                  >
                    <h4 className="text-sm font-extrabold uppercase tracking-wide text-amber-700">局部改写</h4>
                    <Textarea
                      rows={3}
                      {...rewriteForm.register('target_text')}
                      placeholder="粘贴需要改写的原文"
                    />
                    <Textarea rows={3} {...rewriteForm.register('instruction')} placeholder="描述改写要求" />
                    <Button type="submit" loading={rewriteMutation.isPending}>
                      <WandSparkles className="mr-1 h-4 w-4" />
                      执行改写
                    </Button>
                  </form>
                </div>
              </>
            ) : null}
          </>
        )}
      </Card>
    </div>
  )
}
