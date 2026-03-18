import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Send, Check, MessageSquare, BookOpen } from 'lucide-react'
import { createProject, brainstormStream, updateProject, type BrainstormSuggestion } from '@/shared/api/projects'
import { queryKeys } from '@/shared/api/queries'
import { Button } from '@/shared/ui/button'
import { StreamingText } from '@/shared/ui/streaming-text'
import { Avatar } from '@/shared/ui/avatar'
import { Kbd } from '@/shared/ui/kbd'
import { cn } from '@/shared/lib/cn'

type Phase = 'input' | 'streaming' | 'conversation'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const inspirationChips = [
  '一个失忆的宇航员在废弃空间站醒来...',
  '古代书院中的师生情谊与权谋',
  '赛博朋克都市里的私家侦探',
  '一封来自未来的神秘信件',
]

/* ============ 进度步骤条 ============ */
function StepsIndicator({ phase }: { phase: Phase }) {
  const steps = [
    { label: '创建项目', done: phase !== 'input' },
    { label: 'AI 构思', done: phase === 'conversation' },
    { label: '确认创建', done: false },
  ]
  return (
    <div className="mb-8 flex items-center justify-center">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center">
          {i > 0 && (
            <div
              className={cn(
                'mx-3 h-px w-8 transition-colors duration-300',
                s.done ? 'bg-[#0F172A]' : 'bg-[#E2E8F0]',
              )}
            />
          )}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                s.done
                  ? 'bg-[#0F172A] text-white'
                  : 'border border-[#E2E8F0] text-muted-foreground',
              )}
            >
              {s.done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium transition-colors duration-300',
                s.done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============ 打字指示器 ============ */
function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  )
}

/* ============ 主页面 ============ */
export function InspirationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [streamingContent, setStreamingContent] = useState('')
  const [suggestion, setSuggestion] = useState<BrainstormSuggestion | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isReplying, setIsReplying] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const streamedContentRef = useRef('')

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
  }

  async function handleSubmit() {
    const text = input.trim()
    if (!text) return

    setPhase('streaming')
    setStreamingContent('')
    streamedContentRef.current = ''
    setError(null)
    setMessages([{ role: 'user', content: text }])

    try {
      const project = await createProject({
        title: text,
        summary: text,
        status: 'draft',
      })
      setProjectId(project.id)

      const controller = new AbortController()
      abortRef.current = controller

      brainstormStream(
        project.id,
        { message: text },
        {
          onContent(chunk) {
            streamedContentRef.current += chunk
            setStreamingContent((prev) => prev + chunk)
            scrollToBottom()
          },
          onDone(result) {
            const aiContent = streamedContentRef.current
            setSuggestion(result)
            setStreamingContent('')
            streamedContentRef.current = ''
            setPhase('conversation')
            setMessages((prev) => [...prev, { role: 'assistant', content: aiContent }])
            scrollToBottom()
          },
          onError(err) {
            console.error('Brainstorm stream error:', err)
            setError(String(err))
            setPhase('conversation')
          },
        },
        controller.signal,
      )
    } catch (err) {
      console.error('Failed to create project:', err)
      setError(String((err as Error).message))
      setPhase('input')
    }
  }

  async function handleReply() {
    if (!projectId || !replyInput.trim()) return

    const text = replyInput.trim()
    setIsReplying(true)
    setStreamingContent('')
    streamedContentRef.current = ''
    setPhase('streaming')

    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setReplyInput('')

    const controller = new AbortController()
    abortRef.current = controller

    brainstormStream(
      projectId,
      { message: text },
      {
        onContent(chunk) {
          streamedContentRef.current += chunk
          setStreamingContent((prev) => prev + chunk)
          scrollToBottom()
        },
        onDone(result) {
          const aiContent = streamedContentRef.current
          setSuggestion(result)
          setStreamingContent('')
          streamedContentRef.current = ''
          setIsReplying(false)
          setPhase('conversation')
          setMessages((prev) => [...prev, { role: 'assistant', content: aiContent }])
          scrollToBottom()
        },
        onError(err) {
          console.error('Reply stream error:', err)
          setIsReplying(false)
          setPhase('conversation')
        },
      },
      controller.signal,
    )
  }

  async function handleConfirm() {
    if (!suggestion || !projectId) return

    setIsConfirming(true)
    try {
      await updateProject(projectId, {
        title: suggestion.title,
        summary: suggestion.summary,
        status: 'draft',
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.project(projectId),
      })
      navigate(`/projects/${projectId}`)
    } catch (err) {
      console.error('Failed to confirm:', err)
      setError(String((err as Error).message))
      setIsConfirming(false)
    }
  }

  /* -------- 初始输入阶段 -------- */
  if (phase === 'input' && !suggestion) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="w-full max-w-2xl space-y-8 text-center animate-fade-in-up">
          {/* Icon decoration */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted">
                <BookOpen className="h-8 w-8 text-foreground" />
              </div>
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F172A] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h1 className="text-4xl font-light tracking-tight text-foreground">
              你的下一个故事
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
              输入一句灵感，AI 将帮你构思故事框架，创建项目并开始创作之旅。
            </p>
          </div>

          {/* Textarea */}
          <div className="space-y-4 text-left">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述你的故事灵感..."
              className="w-full resize-none rounded-lg border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground transition-all duration-150 placeholder:text-[#94A3B8] focus:border-[#0F172A] focus:outline-none"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit()
                }
              }}
            />

            {/* Inspiration chips */}
            <div className="flex flex-wrap gap-2">
              {inspirationChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setInput(chip)}
                  className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-[#0F172A] hover:bg-muted hover:text-foreground"
                >
                  {chip}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Kbd>⌘</Kbd>
                <span>+</span>
                <Kbd>Enter</Kbd>
                <span className="ml-1">发送</span>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!input.trim()}
                leftIcon={<Send className="h-4 w-4" />}
              >
                开始构思
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* -------- 流式 / 对话阶段 -------- */

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <StepsIndicator phase={phase} />

      {/* Messages */}
      <div className="space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="flex gap-3 animate-fade-in-up"
          >
            <Avatar
              variant={msg.role === 'user' ? 'user' : 'ai'}
              size="sm"
            />
            <div
              className={cn(
                'flex-1 rounded-lg px-4 py-3',
                msg.role === 'user'
                  ? 'bg-muted border border-[#E2E8F0]'
                  : 'bg-card border border-border',
              )}
            >
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                {msg.role === 'user' ? '你的灵感' : 'AI 助手'}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {phase === 'streaming' && streamingContent && (
          <div className="flex gap-3 animate-fade-in-up">
            <Avatar variant="ai" size="sm" />
            <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">AI 助手</p>
              <StreamingText content={streamingContent} isStreaming />
            </div>
          </div>
        )}

        {/* AI suggestion card */}
        {suggestion && phase === 'conversation' && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white px-5 py-5">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground">AI 建议的项目框架</span>
            </div>
            {suggestion.title && (
              <div className="mb-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  标题
                </span>
                <p className="mt-0.5 text-base font-medium text-foreground">
                  {suggestion.title}
                </p>
              </div>
            )}
            {suggestion.summary && (
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  简介
                </span>
                <p className="mt-0.5 text-sm leading-7 text-foreground">
                  {suggestion.summary}
                </p>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Reply / Confirm */}
      {phase === 'conversation' && (
        <div className="sticky bottom-4 mt-6 rounded-lg border border-[#E2E8F0] bg-white p-4">
          <textarea
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder="继续对话，修改构思..."
            className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground transition-colors placeholder:text-[#94A3B8] focus:border-[#0F172A] focus:outline-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleReply()
              }
            }}
          />
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={handleReply}
              disabled={!replyInput.trim() || isReplying}
              leftIcon={<MessageSquare className="h-4 w-4" />}
            >
              继续对话
            </Button>
            <Button
              onClick={handleConfirm}
              loading={isConfirming}
              leftIcon={<Check className="h-4 w-4" />}
            >
              确认创建
            </Button>
          </div>
        </div>
      )}

      {/* Initial loading — typing indicator */}
      {phase === 'streaming' && !streamingContent && (
        <div className="mt-4 flex gap-3 animate-fade-in-up">
          <Avatar variant="ai" size="sm" />
          <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3">
            <p className="mb-1 text-[11px] font-medium text-muted-foreground">AI 助手</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TypingDots />
              <span>正在构思你的故事…</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
