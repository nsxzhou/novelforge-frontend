import { useState, useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/input'
import { StreamingText } from '@/shared/ui/streaming-text'
import { rewriteChapterStream } from '@/shared/api/chapters'
import type { ChapterGenerationResponse } from '@/shared/api/chapters'
import { WandSparkles, Square, X, ArrowLeftRight } from 'lucide-react'
import { DiffEditor } from './diff-editor'

type RewritePopoverProps = {
  chapterId: string
  selectedText: string
  onClose: () => void
  onComplete: (result: ChapterGenerationResponse) => void
}

export function RewritePopover({
  chapterId,
  selectedText,
  onClose,
  onComplete,
}: RewritePopoverProps) {
  const [instruction, setInstruction] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedResult, setCompletedResult] = useState<ChapterGenerationResponse | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!instruction.trim()) return

    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    setCompletedResult(null)
    setShowDiff(false)
    abortRef.current = new AbortController()

    rewriteChapterStream(
      chapterId,
      { target_text: selectedText, instruction: instruction.trim() },
      {
        onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
        onDone: (result: ChapterGenerationResponse) => {
          setIsStreaming(false)
          setCompletedResult(result)
        },
        onError: (errMsg: string) => {
          setIsStreaming(false)
          setError(errMsg)
        },
      },
      abortRef.current.signal,
    )
  }

  function handleCancel() {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  function handleDiffAccept(mergedText: string) {
    if (!completedResult) return
    // Create a modified result with the merged content
    const modifiedResult: ChapterGenerationResponse = {
      ...completedResult,
      chapter: { ...completedResult.chapter, content: mergedText },
    }
    onComplete(modifiedResult)
  }

  function handleDiffCancel() {
    setShowDiff(false)
  }

  function handleDirectAccept() {
    if (completedResult) {
      onComplete(completedResult)
    }
  }

  // Show diff editor when user clicks "Compare Changes"
  if (showDiff && completedResult) {
    return (
      <div className="rounded-lg border border-amber-200 bg-white p-4">
        <DiffEditor
          originalText={selectedText}
          rewrittenText={streamingContent}
          onAccept={handleDiffAccept}
          onCancel={handleDiffCancel}
        />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-extrabold uppercase tracking-wide text-amber-600">
          改写选中文本
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-3 rounded-md bg-amber-100/50 p-2">
        <p className="text-xs font-medium text-amber-700">选中内容：</p>
        <p className="mt-1 text-sm text-amber-900 line-clamp-3">{selectedText}</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="描述改写要求"
          disabled={isStreaming}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={isStreaming || !instruction.trim()}>
            <WandSparkles className="mr-1 h-4 w-4" />
            执行改写
          </Button>
          {isStreaming ? (
            <Button type="button" variant="danger" size="sm" onClick={handleCancel}>
              <Square className="mr-1 h-4 w-4" />
              取消
            </Button>
          ) : null}
        </div>
      </form>

      {isStreaming ? (
        <div className="mt-3 rounded-md bg-white/60 p-3">
          <p className="mb-1 text-xs font-medium text-amber-600">AI 改写中</p>
          <StreamingText content={streamingContent} isStreaming={isStreaming} />
        </div>
      ) : null}

      {/* Show results and compare button after streaming completes */}
      {completedResult && !isStreaming ? (
        <div className="mt-3 space-y-3">
          <div className="rounded-md bg-white/60 p-3">
            <p className="mb-1 text-xs font-medium text-emerald-600">改写完成</p>
            <p className="text-sm text-foreground line-clamp-5">{streamingContent}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowDiff(true)}>
              <ArrowLeftRight className="mr-1 h-3.5 w-3.5" />
              对比更改
            </Button>
            <Button size="sm" onClick={handleDirectAccept}>
              直接应用
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-600">{error}</p>
      ) : null}
    </div>
  )
}
