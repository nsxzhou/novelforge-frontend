import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Send, Check, MessageSquare, BookOpen } from 'lucide-react'
import { motion } from 'framer-motion'
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
import { Avatar } from '@/shared/ui/avatar'
import { Kbd } from '@/shared/ui/kbd'
import { cn } from '@/shared/lib/cn'
import { variants, transitions } from '@/shared/lib/motion'

type Phase = 'input' | 'streaming' | 'conversation'

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
                s.done ? 'bg-ink-400' : 'bg-stone-200',
              )}
            />
          )}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                s.done
                  ? 'bg-ink-500 text-white'
                  : 'border border-stone-300 text-stone-400',
              )}
            >
              {s.done ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium transition-colors duration-300',
                s.done ? 'text-ink-600' : 'text-stone-400',
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
          className="inline-block h-1.5 w-1.5 rounded-full bg-ink-400/60 animate-bounce-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
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
      const project = await createProject({
        title: text,
        summary: text,
        status: 'draft',
      })
      setProjectId(project.id)

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

  /* -------- 初始输入阶段 -------- */
  if (phase === 'input' && !conversation) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={variants.staggerChildrenSlow}
          className="w-full max-w-2xl space-y-8 text-center"
        >
          {/* Icon decoration */}
          <motion.div variants={variants.scaleIn} className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-ink-100 to-ink-50">
                <BookOpen className="h-8 w-8 text-ink-500" />
              </div>
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-ink-500 text-white shadow-glow animate-float-slow">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div variants={variants.fadeInUp} className="space-y-3">
            <h1 className="font-display text-4xl tracking-tight text-foreground">
              你的下一个<span className="gradient-text">故事</span>
            </h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground leading-relaxed">
              输入一句灵感，AI 将帮你构思故事框架，创建项目并开始创作之旅。
            </p>
          </motion.div>

          {/* Textarea */}
          <motion.div variants={variants.fadeInUp} className="space-y-4 text-left">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="描述你的故事灵感..."
              className="w-full resize-none rounded-xl border border-border bg-card px-4 py-4 text-sm leading-7 text-foreground shadow-xs transition-all duration-200 placeholder:text-stone-400 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-500/15 focus:shadow-glow"
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
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600 transition-all hover:border-ink-200 hover:bg-ink-50 hover:text-ink-600"
                >
                  {chip}
                </button>
              ))}
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
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
          </motion.div>
        </motion.div>
      </div>
    )
  }

  /* -------- 流式 / 对话阶段 -------- */
  const messages = conversation?.messages ?? []
  const suggestion = conversation?.pending_suggestion

  return (
    <div className="mx-auto max-w-3xl pb-8">
      <StepsIndicator phase={phase} />

      {/* Messages */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants.staggerChildren}
        className="space-y-4"
      >
        {messages.map(
            (msg) =>
              msg.role !== 'system' && (
                <motion.div
                  key={msg.id}
                  variants={variants.fadeInUp}
                  transition={transitions.springGentle}
                  className="flex gap-3"
                >
                  <Avatar
                    variant={msg.role === 'user' ? 'user' : 'ai'}
                    size="sm"
                  />
                  <div
                    className={cn(
                      'flex-1 rounded-xl px-4 py-3',
                      msg.role === 'user'
                        ? 'bg-ink-50/60 border border-ink-100'
                        : 'bg-card border border-border shadow-xs',
                    )}
                  >
                    <p className="mb-1 text-[11px] font-medium text-stone-400">
                      {msg.role === 'user' ? '你的灵感' : 'AI 助手'}
                    </p>
                    <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ),
          )}

        {/* Streaming content */}
        {phase === 'streaming' && streamingContent && (
          <motion.div
            variants={variants.fadeInUp}
            transition={transitions.springGentle}
            className="flex gap-3"
          >
            <Avatar variant="ai" size="sm" />
            <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
              <p className="mb-1 text-[11px] font-medium text-stone-400">AI 助手</p>
              <StreamingText content={streamingContent} isStreaming />
            </div>
          </motion.div>
        )}

        {/* AI suggestion card */}
        {suggestion && phase === 'conversation' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={transitions.springGentle}
            className="rounded-xl border border-ink-200 gradient-surface px-5 py-5 shadow-sm"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-ink-500" />
              <span className="text-xs font-semibold text-ink-600">AI 建议的项目框架</span>
            </div>
            {suggestion.title && (
              <div className="mb-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  标题
                </span>
                <p className="mt-0.5 text-base font-semibold text-foreground">
                  {suggestion.title}
                </p>
              </div>
            )}
            {suggestion.summary && (
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-stone-400">
                  简介
                </span>
                <p className="mt-0.5 text-sm leading-7 text-stone-700">
                  {suggestion.summary}
                </p>
              </div>
            )}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </motion.div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Reply / Confirm — sticky card with backdrop blur */}
      {phase === 'conversation' && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 mt-6 rounded-xl border border-border bg-card/90 p-4 shadow-md backdrop-blur-card"
        >
          <textarea
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder="继续对话，修改构思..."
            className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm leading-relaxed text-foreground transition-colors placeholder:text-stone-400 focus:border-ink-400 focus:outline-none focus:ring-1 focus:ring-ink-500/15"
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
        </motion.div>
      )}

      {/* Initial loading — typing indicator */}
      {phase === 'streaming' && !streamingContent && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex gap-3"
        >
          <Avatar variant="ai" size="sm" />
          <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
            <p className="mb-1 text-[11px] font-medium text-stone-400">AI 助手</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TypingDots />
              <span>正在构思你的故事…</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
