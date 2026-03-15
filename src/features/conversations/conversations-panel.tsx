import { useCallback, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare, SendHorizontal, ShieldCheck, Square } from 'lucide-react'
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
import { Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { StreamingText } from '@/shared/ui/streaming-text'
import { getErrorMessage } from '@/shared/lib/error-message'

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

export function ConversationsPanel({
  project,
  assets,
}: {
  project: Project
  assets: Asset[]
}) {
  const projectId = project.id
  const queryClient = useQueryClient()
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const startForm = useForm<StartFormValue>({
    resolver: zodResolver(startSchema),
    defaultValues: {
      target_type: 'project',
      target_id: project.id,
      message: '',
    },
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
    return assets.map((asset) => ({
      id: asset.id,
      label: `${asset.title}（${asset.type}）`,
    }))
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
    abortRef.current = new AbortController()

    startConversationStream(
      projectId,
      value,
      {
        onContent: (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)
        },
        onDone: async (conversation: Conversation) => {
          setIsStreaming(false)
          setSelectedConversation(conversation)
          startForm.reset({ target_type: value.target_type, target_id: value.target_id, message: '' })
          replyForm.reset({ message: '' })
          setError(null)
          await refreshConversations(conversation)
        },
        onError: (errMsg: string) => {
          setIsStreaming(false)
          setError(errMsg)
        },
      },
      abortRef.current.signal,
    )
  }

  function handleReplySubmit(value: ReplyFormValue) {
    if (!selectedConversation) {
      setError('请先创建或选择对话。')
      return
    }
    setStreamingContent('')
    setIsStreaming(true)
    setError(null)
    abortRef.current = new AbortController()

    replyConversationStream(
      selectedConversation.id,
      value,
      {
        onContent: (chunk: string) => {
          setStreamingContent((prev) => prev + chunk)
        },
        onDone: async (conversation: Conversation) => {
          setIsStreaming(false)
          setSelectedConversation(conversation)
          replyForm.reset({ message: '' })
          setError(null)
          await refreshConversations(conversation)
        },
        onError: (errMsg: string) => {
          setIsStreaming(false)
          setError(errMsg)
        },
      },
      abortRef.current.signal,
    )
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
    },
    onError: (mutationError) => {
      setError(getErrorMessage(mutationError))
    },
  })

  const conversations = conversationsQuery.data ?? []

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <SectionTitle
            eyebrow="Conversation"
            title="发起微调对话"
            description="支持项目和资产的对话微调。"
          />

          <form className="space-y-3" onSubmit={startForm.handleSubmit(handleStartSubmit)}>
            <div>
              <label className="mb-1 block text-sm font-semibold">目标类型</label>
              <Select
                {...startForm.register('target_type')}
                onChange={(event) => {
                  const nextType = event.target.value as 'project' | 'asset'
                  startForm.setValue('target_type', nextType)
                  if (nextType === 'project') {
                    startForm.setValue('target_id', project.id)
                  } else {
                    startForm.setValue('target_id', assets[0]?.id ?? '')
                  }
                }}
              >
                <option value="project">项目</option>
                <option value="asset">资产</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">目标对象</label>
              <Select {...startForm.register('target_id')}>
                {targetOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">首条指令</label>
              <Textarea rows={4} {...startForm.register('message')} placeholder="例如：把项目氛围改得更阴郁。" />
            </div>

            <Button type="submit" disabled={isStreaming}>
              <MessagesSquare className="mr-1 h-4 w-4" />
              开始对话
            </Button>
          </form>
        </Card>

        <Card>
          <SectionTitle eyebrow="History" title="历史会话" />

          {conversationsQuery.isLoading ? <LoadingState text="加载会话中..." /> : null}
          {conversationsQuery.error ? <ErrorState text={getErrorMessage(conversationsQuery.error)} /> : null}

          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className="w-full rounded-md bg-muted px-3 py-2 text-left text-sm transition-all duration-200 hover:scale-[1.02] hover:bg-muted"
                onClick={() => setSelectedConversation(conversation)}
                type="button"
              >
                <div className="font-semibold">
                  {conversation.target_type === 'project' ? '项目微调' : '资产微调'}
                </div>
                <div className="text-xs text-muted-foreground">{conversation.updated_at}</div>
              </button>
            ))}

            {conversations.length === 0 && !conversationsQuery.isLoading ? (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">当前筛选条件下没有会话。</p>
            ) : null}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle
          eyebrow="Detail"
          title="会话详情"
          description="助手建议会出现在 pending_suggestion，确认后写回项目或资产。"
          action={
            <div className="flex gap-2">
              {isStreaming ? (
                <Button variant="danger" size="sm" onClick={cancelStream}>
                  <Square className="mr-1 h-4 w-4" />
                  取消生成
                </Button>
              ) : null}
              {selectedConversation?.pending_suggestion && !isStreaming ? (
                <Button
                  variant="outline"
                  size="sm"
                  loading={confirmMutation.isPending}
                  onClick={() => confirmMutation.mutate(selectedConversation.id)}
                >
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  确认建议并写回
                </Button>
              ) : null}
            </div>
          }
        />

        {error ? <ErrorState text={error} /> : null}

        {!selectedConversation && !isStreaming ? (
          <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">请选择一个会话，或先创建新会话。</p>
        ) : null}

        {selectedConversation ? (
          <>
            <div className="space-y-2">
              {selectedConversation.messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-md p-3 text-sm leading-6 ${
                    message.role === 'assistant'
                      ? 'bg-accent/5'
                      : message.role === 'user'
                        ? 'bg-amber-50'
                        : 'bg-muted'
                  }`}
                >
                  <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                    message.role === 'assistant'
                      ? 'text-accent'
                      : message.role === 'user'
                        ? 'text-amber-600'
                        : 'text-muted-foreground'
                  }`}>
                    {message.role === 'assistant' ? '助手' : message.role === 'user' ? '用户' : '系统'}
                  </p>
                  <p className="whitespace-pre-wrap text-foreground">{message.content}</p>
                </article>
              ))}
            </div>

            {isStreaming ? (
              <article className="mt-2 rounded-md bg-accent/5 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent">助手</p>
                <StreamingText content={streamingContent} isStreaming={isStreaming} />
              </article>
            ) : null}

            {selectedConversation.pending_suggestion && !isStreaming ? (
              <article className="mt-4 rounded-lg bg-accent/5 p-4">
                <h4 className="text-sm font-extrabold uppercase tracking-wide text-accent">Pending Suggestion</h4>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">标题：</span>
                  {selectedConversation.pending_suggestion.title || '-'}
                </p>
                {selectedConversation.pending_suggestion.summary ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    <span className="font-semibold">简介：</span>
                    {selectedConversation.pending_suggestion.summary}
                  </p>
                ) : null}
                {selectedConversation.pending_suggestion.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    <span className="font-semibold">内容：</span>
                    {selectedConversation.pending_suggestion.content}
                  </p>
                ) : null}
              </article>
            ) : null}

            {!selectedConversation.pending_suggestion && !isStreaming ? (
              <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">当前会话暂无待确认建议。</p>
            ) : null}

            <form className="mt-4 space-y-3" onSubmit={replyForm.handleSubmit(handleReplySubmit)}>
              <label className="block text-sm font-semibold">继续追问</label>
              <Textarea rows={3} {...replyForm.register('message')} placeholder="例如：把语气再收敛一些。" />
              <Button type="submit" disabled={isStreaming}>
                <SendHorizontal className="mr-1 h-4 w-4" />
                发送消息
              </Button>
            </form>
          </>
        ) : null}
      </Card>
    </div>
  )
}
