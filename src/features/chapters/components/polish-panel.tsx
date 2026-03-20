import { useRef, useState } from 'react'
import { Sparkles, Check, X, Square, Loader2 } from 'lucide-react'
import { polishChapterStream, type PolishResponse } from '@/shared/api/chapters'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { StreamingText } from '@/shared/ui/streaming-text'

type PolishPanelProps = {
  chapterId: string
  currentContent: string
  onAccept: (polishedContent: string) => void
  onClose: () => void
}

type PolishState = 'idle' | 'streaming' | 'done'

export function PolishPanel({ chapterId, currentContent, onAccept, onClose }: PolishPanelProps) {
  const [polishState, setPolishState] = useState<PolishState>('idle')
  const [polishedContent, setPolishedContent] = useState('')
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function handleStartPolish() {
    setPolishState('streaming')
    setStreamingContent('')
    setPolishedContent('')
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    polishChapterStream(
      chapterId,
      {
        onContent: (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)
        },
        onDone: (result: PolishResponse) => {
          abortRef.current = null
          setPolishedContent(result.polished_content)
          setPolishState('done')
        },
        onError: (errMsg: string) => {
          abortRef.current = null
          setError(errMsg)
          setPolishState('idle')
        },
      },
      controller.signal,
    )
  }

  function handleCancel() {
    abortRef.current?.abort()
    abortRef.current = null
    setPolishState('idle')
    setStreamingContent('')
  }

  function handleAccept() {
    onAccept(polishedContent)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-foreground">消痕润色</h3>
          {polishState === 'streaming' && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              润色中...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {polishState === 'idle' && (
            <>
              <Button
                size="sm"
                onClick={handleStartPolish}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                开始润色
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                关闭
              </Button>
            </>
          )}
          {polishState === 'streaming' && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              leftIcon={<Square className="h-3.5 w-3.5" />}
            >
              取消
            </Button>
          )}
          {polishState === 'done' && (
            <>
              <Button
                size="sm"
                onClick={handleAccept}
                leftIcon={<Check className="h-3.5 w-3.5" />}
              >
                采纳
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                leftIcon={<X className="h-3.5 w-3.5" />}
              >
                放弃
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {polishState === 'idle' && !error && (
        <p className="text-sm text-muted-foreground">
          点击"开始润色"对当前章节内容进行 AI 消痕润色，去除机器痕迹，提升文学质感。
        </p>
      )}

      {(polishState === 'streaming' || polishState === 'done') && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">原文</p>
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {currentContent}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              润色后
              {polishState === 'streaming' && (
                <span className="ml-1 text-amber-500">（生成中...）</span>
              )}
            </p>
            <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-amber-50/30 p-3 text-sm leading-relaxed">
              {polishState === 'streaming' ? (
                <StreamingText content={streamingContent} isStreaming />
              ) : (
                <span className="whitespace-pre-wrap">{polishedContent}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
