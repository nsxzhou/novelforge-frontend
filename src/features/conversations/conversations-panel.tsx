import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MessagesSquare, SendHorizontal, ShieldCheck, Square,
  Plus, MessageCircle, Clock, ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  confirmConversation,
  listConversations,
  replyConversationStream,
  startConversationStream,
} from '@/shared/api/conversations'
import { queryKeys } from '@/shared/api/queries'
import type { Asset, Conversation, Project } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Select, Textarea, FormField } from '@/shared/ui/input'
import { StreamingText } from '@/shared/ui/streaming-text'
import { Avatar } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants, transitions } from '@/shared/lib/motion'
import { cn } from '@/shared/lib/cn'

const startSchema = z.object({
  target_type: z.enum(['project', 'asset']),
  target_id: z.string().trim().min(1, '请选择目标对象'),
  message: z.string().trim().min(1, '请输入首条指令'),
})

const replySchema = z.object({
  message: z.string().trim().min(1, '请输入回复内容'),
})

type StartFormValue = z.infer<typeof startSchema>
type ReplyFormValue = z.infer<typeof replySchema>

function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return '刚刚'
    if (mins < 60) return `${mins}分钟前`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}小时前`
    const days = Math.floor(hours / 24)
    return `${days}天前`
  } catch {
    return iso
  }
}

export function ConversationsPanel({
  project,
  assets,
}: {
  project: Project
  assets: Asset[]
}) {
  const projectId = project.id
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const startForm = useForm<StartFormValue>({
    resolver: zodResolver(startSchema),
    defaultValues: { target_type: 'project', target_id: project.id, message: '' },
  })

  const replyForm = useForm<ReplyFormValue>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: '' },
  })

  const targetType = startForm.watch('target_type')

  const targetOptions = useMemo(() => {
    if (targetType === 'project') {
      return [{ id: project.id, label: `项目：${project.title}` }]
    }
    return assets.map((asset) => ({ id: asset.id, label: `${asset.title}（${asset.type}）` }))
  }, [assets, project.id, project.title, targetType])

  const conversationsQuery = useQuery({
    queryKey: queryKeys.conversations(
      projectId,
      selectedConversation?.target_type ?? targetType,
      selectedConversation?.target_id ?? startForm.getValues('target_id') ?? project.id,
    ),
    queryFn: () =>
      listConversations({
        projectId,
        targetType: selectedConversation?.target_type ?? targetType,
        targetId: selectedConversation?.target_id ?? startForm.getValues('target_id') ?? project.id,
        limit: 50,
        offset: 0,
      }),
  })

  const refreshConversations = useCallback(async (conv: Conversation) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.conversations(projectId, conv.target_type, conv.target_id),
    })
  }, [queryClient, projectId])

  function cancelStream() {
    abortRef.current?.abort()
    setIsStreaming(false)
  }

  function handleStartSubmit(value: StartFormValue) {
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    setShowNewDialog(false)
    abortRef.current = new AbortController()

    startConversationStream(projectId, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (conversation: Conversation) => {
        setIsStreaming(false)
        setSelectedConversation(conversation)
        startForm.reset({ target_type: value.target_type, target_id: value.target_id, message: '' })
        replyForm.reset({ message: '' })
        setError(null)
        await refreshConversations(conversation)
        toast('对话已创建')
      },
      onError: (errMsg: string) => { setIsStreaming(false); setError(errMsg) },
    }, abortRef.current.signal)
  }

  function handleReplySubmit(value: ReplyFormValue) {
    if (!selectedConversation) { setError('请先创建或选择对话。'); return }
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    abortRef.current = new AbortController()

    replyConversationStream(selectedConversation.id, value, {
      onContent: (chunk: string) => setStreamingContent((prev) => prev + chunk),
      onDone: async (conversation: Conversation) => {
        setIsStreaming(false)
        setSelectedConversation(conversation)
        replyForm.reset({ message: '' })
        setError(null)
        await refreshConversations(conversation)
      },
      onError: (errMsg: string) => { setIsStreaming(false); setError(errMsg) },
    }, abortRef.current.signal)
  }

  const confirmMutation = useMutation({
    mutationFn: (conversationId: string) => confirmConversation(conversationId),
    onSuccess: async (result) => {
      setSelectedConversation(result.conversation)
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets(projectId, 'all') })
      await refreshConversations(result.conversation)
      setError(null)
      toast('建议已确认并写回')
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  })

  const conversations = conversationsQuery.data ?? []

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Left: History list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">会话列表</h3>
          <Button size="sm" variant="tonal" onClick={() => setShowNewDialog(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            新对话
          </Button>
        </div>

        {conversationsQuery.isLoading && <LoadingState text="加载会话中..." />}
        {conversationsQuery.error && <ErrorState text={getErrorMessage(conversationsQuery.error)} />}

        <motion.div initial="hidden" animate="visible" variants={variants.staggerChildren} className="space-y-1.5">
          {conversations.map((conv) => {
            const isActive = selectedConversation?.id === conv.id
            const hasPending = !!conv.pending_suggestion
            return (
              <motion.button
                key={conv.id}
                variants={variants.fadeInUp}
                onClick={() => setSelectedConversation(conv)}
                type="button"
                className={cn(
                  'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
                  isActive
                    ? 'bg-ink-50 border border-ink-200 shadow-xs'
                    : 'hover:bg-stone-50 border border-transparent',
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className={cn('h-3.5 w-3.5 shrink-0', isActive ? 'text-ink-500' : 'text-stone-400')} />
                  <span className="text-sm font-medium truncate">
                    {conv.target_type === 'project' ? '项目微调' : '资产微调'}
                  </span>
                  {hasPending && <Badge variant="warning" className="text-[10px] ml-auto">待确认</Badge>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-stone-400 pl-5.5">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(conv.updated_at)}
                  <span className="ml-auto">{conv.messages.length} 条</span>
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {conversations.length === 0 && !conversationsQuery.isLoading && (
          <EmptyState
            icon={<MessagesSquare className="h-5 w-5" />}
            title="暂无会话"
            description="创建新对话以开始微调"
            className="py-8"
          />
        )}
      </div>

      {/* Right: Conversation detail */}
      <Card>
        {!selectedConversation && !isStreaming ? (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" />}
            title="选择一个会话"
            description="从左侧选择会话，或创建新对话"
            className="border-none bg-transparent"
          />
        ) : (
          <div className="space-y-4">
            {/* Action bar */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">会话详情</h3>
              <div className="flex gap-2">
                {isStreaming && (
                  <Button variant="danger" size="sm" onClick={cancelStream} leftIcon={<Square className="h-3.5 w-3.5" />}>
                    取消
                  </Button>
                )}
                {selectedConversation?.pending_suggestion && !isStreaming && (
                  <Button
                    variant="primary"
                    size="sm"
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate(selectedConversation.id)}
                    leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                  >
                    确认并应用
                  </Button>
                )}
              </div>
            </div>

            {error && <ErrorState text={error} />}

            {/* Messages */}
            {selectedConversation && (
              <motion.div initial="hidden" animate="visible" variants={variants.staggerChildren} className="space-y-3">
                  {selectedConversation.messages.map((message) => (
                    <motion.div
                      key={message.id}
                      variants={variants.fadeInUp}
                      transition={transitions.springGentle}
                      className="flex gap-3"
                    >
                      <Avatar variant={message.role === 'user' ? 'user' : message.role === 'assistant' ? 'ai' : 'neutral'} size="sm" />
                      <div className={cn(
                        'flex-1 rounded-lg px-4 py-3',
                        message.role === 'user' ? 'bg-ink-50/60' : message.role === 'assistant' ? 'bg-card border border-border shadow-xs' : 'bg-stone-50',
                      )}>
                        <p className="mb-1 text-[11px] font-medium text-stone-400">
                          {message.role === 'assistant' ? '助手' : message.role === 'user' ? '用户' : '系统'}
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{message.content}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
            )}

            {/* Streaming */}
            {isStreaming && (
              <div className="flex gap-3">
                <Avatar variant="ai" size="sm" />
                <div className="flex-1 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
                  <p className="mb-1 text-[11px] font-medium text-stone-400">助手</p>
                  <StreamingText content={streamingContent} isStreaming={isStreaming} />
                </div>
              </div>
            )}

            {/* Pending suggestion highlight */}
            {selectedConversation?.pending_suggestion && !isStreaming && (
              <Card variant="highlighted" highlightColor="#6366F1" padding="md">
                <div className="flex items-center gap-2 mb-3">
                  <ChevronRight className="h-4 w-4 text-ink-500" />
                  <span className="text-xs font-semibold text-ink-600">待确认建议</span>
                </div>
                {selectedConversation.pending_suggestion.title && (
                  <p className="text-sm"><span className="font-semibold">标题：</span>{selectedConversation.pending_suggestion.title}</p>
                )}
                {selectedConversation.pending_suggestion.summary && (
                  <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{selectedConversation.pending_suggestion.summary}</p>
                )}
                {selectedConversation.pending_suggestion.content && (
                  <p className="mt-1 text-sm text-stone-600 whitespace-pre-wrap">{selectedConversation.pending_suggestion.content}</p>
                )}
              </Card>
            )}

            {/* Reply form */}
            {selectedConversation && !isStreaming && (
              <form className="space-y-3 border-t border-border pt-4" onSubmit={replyForm.handleSubmit(handleReplySubmit)}>
                <Textarea rows={2} {...replyForm.register('message')} placeholder="继续对话..." />
                <div className="flex justify-end">
                  <Button type="submit" size="sm" disabled={isStreaming} leftIcon={<SendHorizontal className="h-3.5 w-3.5" />}>
                    发送
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Card>

      {/* New conversation dialog */}
      <Dialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        title="发起新对话"
        description="选择微调目标并输入首条指令"
      >
        <form className="space-y-4" onSubmit={startForm.handleSubmit(handleStartSubmit)}>
          <FormField label="目标类型">
            <Select
              {...startForm.register('target_type')}
              onChange={(event) => {
                const nextType = event.target.value as 'project' | 'asset'
                startForm.setValue('target_type', nextType)
                startForm.setValue('target_id', nextType === 'project' ? project.id : assets[0]?.id ?? '')
              }}
            >
              <option value="project">项目</option>
              <option value="asset">资产</option>
            </Select>
          </FormField>
          <FormField label="目标对象">
            <Select {...startForm.register('target_id')}>
              {targetOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="首条指令">
            <Textarea rows={3} {...startForm.register('message')} placeholder="例如：把项目氛围改得更阴郁。" />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowNewDialog(false)}>取消</Button>
            <Button type="submit" disabled={isStreaming} leftIcon={<MessagesSquare className="h-3.5 w-3.5" />}>开始对话</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
