import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCcw, WandSparkles, Square } from 'lucide-react'
import {
  continueChapterStream,
  rewriteChapterStream,
  updateChapter,
} from '@/shared/api/chapters'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import { invalidateProjectChapters } from '@/shared/api/query-invalidation'
import { Button } from '@/shared/ui/button'
import { Textarea, FormField } from '@/shared/ui/input'
import { ErrorState } from '@/shared/ui/feedback'
import { StreamingText } from '@/shared/ui/streaming-text'
import { useToast } from '@/shared/ui/toast'
import { normalizeServiceErrorMessage } from '@/shared/lib/error-message'
import { ReviewPanel } from './review-panel'
import { PolishPanel } from './polish-panel'

const continueSchema = z.object({
  instruction: z.string().trim().min(1, '请填写续写要求'),
})

const rewriteSchema = z.object({
  target_text: z.string().trim().min(1, '请填写要改写的原文'),
  instruction: z.string().trim().min(1, '请填写改写要求'),
})

type ContinueFormValue = z.infer<typeof continueSchema>
type RewriteFormValue = z.infer<typeof rewriteSchema>

type AIOperationsPanelProps = {
  activeOperation: 'continue' | 'rewrite' | 'review' | 'polish'
  chapterId: string
  projectId: string
  chapterContent: string
  isDraft: boolean
  onContentUpdated?: () => void
}

export function AIOperationsPanel({
  activeOperation,
  chapterId,
  projectId,
  chapterContent,
  isDraft,
  onContentUpdated,
}: AIOperationsPanelProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const continueForm = useForm<ContinueFormValue>({
    resolver: zodResolver(continueSchema),
    defaultValues: { instruction: '' },
  })

  const rewriteForm = useForm<RewriteFormValue>({
    resolver: zodResolver(rewriteSchema),
    defaultValues: { target_text: '', instruction: '' },
  })

  const refreshChapters = useCallback(async () => {
    await invalidateProjectChapters(queryClient, projectId, chapterId)
  }, [queryClient, projectId, chapterId])

  const saveMutation = useMutation({
    mutationFn: (content: string) => updateChapter(chapterId, { content }),
    onSuccess: async () => {
      await refreshChapters()
      onContentUpdated?.()
      toast('已保存')
    },
  })

  function startStream() {
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    abortRef.current = new AbortController()
  }

  function cancelStream() {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }

  function handleContinueSubmit(value: ContinueFormValue) {
    startStream()
    continueChapterStream(chapterId, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async () => {
        abortRef.current = null
        setIsStreaming(false)
        continueForm.reset({ instruction: '' })
        await refreshChapters()
        onContentUpdated?.()
        toast('续写完成')
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setError(normalizeServiceErrorMessage(errMsg))
      },
    }, abortRef.current!.signal)
  }

  function handleRewriteSubmit(value: RewriteFormValue) {
    startStream()
    rewriteChapterStream(chapterId, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (_result: ChapterGenerationResponse) => {
        abortRef.current = null
        setIsStreaming(false)
        rewriteForm.reset({ target_text: '', instruction: '' })
        await refreshChapters()
        onContentUpdated?.()
        toast('改写完成')
      },
      onError: (errMsg: string) => {
        abortRef.current = null
        setIsStreaming(false)
        setError(normalizeServiceErrorMessage(errMsg))
      },
    }, abortRef.current!.signal)
  }

  return (
    <div className="space-y-4">
      {error && <ErrorState text={error} />}

      {isStreaming && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">AI 生成中</span>
            <Button variant="danger" size="sm" onClick={cancelStream} leftIcon={<Square className="h-3.5 w-3.5" />}>
              取消
            </Button>
          </div>
          <StreamingText content={streamingContent} isStreaming={isStreaming} />
        </div>
      )}

      {!isStreaming && (
        <>
          {activeOperation === 'continue' && (
            <form className="space-y-3" onSubmit={continueForm.handleSubmit(handleContinueSubmit)}>
              <FormField label="续写要求">
                <Textarea rows={3} {...continueForm.register('instruction')} placeholder="输入续写要求" />
              </FormField>
              <Button type="submit" size="sm" disabled={!isDraft} leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}>
                执行续写
              </Button>
            </form>
          )}

          {activeOperation === 'rewrite' && (
            <form className="space-y-3" onSubmit={rewriteForm.handleSubmit(handleRewriteSubmit)}>
              <FormField label="要改写的原文">
                <Textarea rows={2} {...rewriteForm.register('target_text')} placeholder="粘贴需要改写的原文" />
              </FormField>
              <FormField label="改写要求">
                <Textarea rows={2} {...rewriteForm.register('instruction')} placeholder="描述改写要求" />
              </FormField>
              <Button type="submit" size="sm" disabled={!isDraft} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
                执行改写
              </Button>
            </form>
          )}

          {activeOperation === 'review' && (
            <ReviewPanel chapterId={chapterId} />
          )}

          {activeOperation === 'polish' && chapterContent && (
            <PolishPanel
              chapterId={chapterId}
              currentContent={chapterContent}
              onAccept={(polishedContent) => saveMutation.mutate(polishedContent)}
              onClose={() => {}}
            />
          )}
        </>
      )}
    </div>
  )
}
