import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Send, Check, MessageSquare } from 'lucide-react'
import { createProject } from '@/shared/api/projects'
import {
  startConversationStream,
  replyConversationStream,
  confirmConversation,
} from '@/shared/api/conversations'
import type { Conversation } from '@/shared/api/types'
import { queryKeys } from '@/shared/api/queries'
import { Button } from '@/shared/ui/button'
import { StreamingText } from '@/shared/ui/streaming-text'
import { cn } from '@/shared/lib/cn'

type Phase = 'input' | 'streaming' | 'conversation'

export function InspirationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [input, setInput] = useState('')
  const [replyInput, setReplyInput] = useState('')
  const [phase, setPhase] = useState<Phase>('input')
  const [streamingContent, setStreamingContent] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [isReplying, setIsReplying] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    setError(null)

    try {
      // Step 1: Create a minimal draft project
      const project = await createProject({
        title: text,
        summary: text,
        status: 'draft',
      })
      setProjectId(project.id)

      // Step 2: Start AI conversation stream
      const controller = new AbortController()
      abortRef.current = controller

      startConversationStream(
        project.id,
        {
          target_type: 'project',
          target_id: project.id,
          message: text,
        },
        {
          onContent(chunk) {
            setStreamingContent((prev) => prev + chunk)
            scrollToBottom()
          },
          onDone(conv) {
            setConversation(conv)
            setStreamingContent('')
            setPhase('conversation')
            scrollToBottom()
          },
          onError(err) {
            console.error('Conversation stream error:', err)
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
    if (!conversation || !replyInput.trim()) return

    const text = replyInput.trim()
    setIsReplying(true)
    setStreamingContent('')
    setPhase('streaming')

    // Optimistically add user message to display
    setConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `temp-${Date.now()}`,
                role: 'user' as const,
                content: text,
                created_at: new Date().toISOString(),
              },
            ],
          }
        : prev,
    )
    setReplyInput('')

    const controller = new AbortController()
    abortRef.current = controller

    replyConversationStream(
      conversation.id,
      { message: text },
      {
        onContent(chunk) {
          setStreamingContent((prev) => prev + chunk)
          scrollToBottom()
        },
        onDone(conv) {
          setConversation(conv)
          setStreamingContent('')
          setIsReplying(false)
          setPhase('conversation')
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
    if (!conversation || !projectId) return

    setIsConfirming(true)
    try {
      await confirmConversation(conversation.id)
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

  // Initial input phase — hero screen
  if (phase === 'input' && !conversation) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-secondary text-white">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="font-display text-4xl tracking-tight">
              你的下一个<span className="gradient-text">故事</span>
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              输入一句灵感，AI 将帮你构思故事框架，创建项目并开始创作之旅。
            </p>
          </div>

          <div className="space-y-4 text-left">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：一个失忆的宇航员在废弃空间站醒来，发现自己是唯一的幸存者..."
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground transition-colors duration-200 placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              rows={4}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit()
                }
              }}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                按 ⌘+Enter 发送
              </span>
              <Button onClick={handleSubmit} disabled={!input.trim()}>
                <Send className="h-4 w-4" />
                开始构思
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Streaming / Conversation phase — chat view
  const messages = conversation?.messages ?? []
  const suggestion = conversation?.pending_suggestion

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Messages */}
      <div className="space-y-4">
        {messages.map(
          (msg) =>
            msg.role !== 'system' && (
              <div
                key={msg.id}
                className={cn(
                  'rounded-xl px-5 py-4',
                  msg.role === 'user'
                    ? 'border border-accent/10 bg-accent/5'
                    : 'border border-border bg-card',
                )}
              >
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {msg.role === 'user' ? '你' : 'AI 助手'}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {msg.content}
                </div>
              </div>
            ),
        )}

        {/* Streaming content */}
        {phase === 'streaming' && streamingContent && (
          <div className="rounded-xl border border-border bg-card px-5 py-4">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              AI 助手
            </div>
            <StreamingText content={streamingContent} isStreaming />
          </div>
        )}

        {/* Pending suggestion card */}
        {suggestion && phase === 'conversation' && (
          <div className="space-y-3 rounded-xl border-2 border-accent/20 bg-accent/5 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-medium text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              AI 建议
            </div>
            {suggestion.title && (
              <div>
                <span className="text-xs text-muted-foreground">标题：</span>
                <span className="text-sm font-medium text-foreground">
                  {suggestion.title}
                </span>
              </div>
            )}
            {suggestion.summary && (
              <div>
                <span className="text-xs text-muted-foreground">简介：</span>
                <span className="text-sm text-foreground">
                  {suggestion.summary}
                </span>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* Reply / Confirm actions */}
      {phase === 'conversation' && (
        <div className="space-y-3">
          <textarea
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder="继续对话，修改构思..."
            className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground transition-colors duration-200 placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleReply()
              }
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              onClick={handleReply}
              disabled={!replyInput.trim() || isReplying}
            >
              <MessageSquare className="h-4 w-4" />
              继续对话
            </Button>
            <Button onClick={handleConfirm} loading={isConfirming}>
              <Check className="h-4 w-4" />
              确认创建
            </Button>
          </div>
        </div>
      )}

      {/* Loading state during initial streaming with no content yet */}
      {phase === 'streaming' && !streamingContent && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <svg
              className="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            AI 正在构思你的故事...
          </div>
        </div>
      )}
    </div>
  )
}
