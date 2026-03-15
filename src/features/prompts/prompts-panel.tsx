import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, RotateCcw, Save } from 'lucide-react'
import { deletePrompt, listPrompts, upsertPrompt } from '@/shared/api/prompts'
import { queryKeys } from '@/shared/api/queries'
import type { PromptTemplate } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { getErrorMessage } from '@/shared/lib/error-message'

const promptSchema = z.object({
  system: z.string().trim().min(1, '请填写 system 模板'),
  user: z.string().trim().min(1, '请填写 user 模板'),
})

type PromptFormValue = z.infer<typeof promptSchema>

export function PromptsPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [editingCapability, setEditingCapability] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const promptsQuery = useQuery({
    queryKey: queryKeys.prompts(projectId),
    queryFn: () => listPrompts(projectId),
  })

  const form = useForm<PromptFormValue>({
    resolver: zodResolver(promptSchema),
    defaultValues: { system: '', user: '' },
  })

  const refreshPrompts = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) })
  }

  const upsertMutation = useMutation({
    mutationFn: ({ capability, input }: { capability: string; input: PromptFormValue }) =>
      upsertPrompt(projectId, capability, input),
    onSuccess: async () => {
      await refreshPrompts()
      setEditingCapability(null)
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (capability: string) => deletePrompt(projectId, capability),
    onSuccess: async () => {
      await refreshPrompts()
      setEditingCapability(null)
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  function handleEdit(prompt: PromptTemplate) {
    setEditingCapability(prompt.capability)
    form.reset({ system: prompt.system, user: prompt.user })
    setError(null)
  }

  function handleCancel() {
    setEditingCapability(null)
    setError(null)
  }

  function handleSubmit(value: PromptFormValue) {
    if (!editingCapability) return
    upsertMutation.mutate({ capability: editingCapability, input: value })
  }

  const prompts = promptsQuery.data ?? []

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Prompts"
        title="Prompt 模板管理"
        description="查看并覆盖项目级 Prompt 模板。标记为「已覆盖」的模板为项目自定义版本。"
      />

      {error ? <ErrorState text={error} /> : null}
      {promptsQuery.isLoading ? <LoadingState text="加载模板中..." /> : null}
      {promptsQuery.error ? <ErrorState text={getErrorMessage(promptsQuery.error)} /> : null}

      {prompts.length === 0 && !promptsQuery.isLoading ? (
        <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">暂无可用的 Prompt 模板。</p>
      ) : null}

      <div className="space-y-4">
        {prompts.map((prompt) => {
          const isEditing = editingCapability === prompt.capability
          return (
            <Card key={prompt.capability} variant={prompt.is_override ? 'featured' : 'default'}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">{prompt.capability}</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${prompt.is_override ? 'border border-accent/20 bg-accent/5 text-accent' : 'border border-border bg-muted text-muted-foreground'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${prompt.is_override ? 'bg-accent' : 'bg-muted-foreground'}`} />
                      {prompt.is_override ? '已覆盖' : '默认'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isEditing ? <Button variant="secondary" size="sm" onClick={() => handleEdit(prompt)}>编辑</Button> : null}
                  {prompt.is_override && !isEditing ? (
                    <Button variant="danger" size="sm" loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(prompt.capability)}>
                      <RotateCcw className="mr-1 h-4 w-4" />重置为默认
                    </Button>
                  ) : null}
                </div>
              </div>
              {prompt.available_variables.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prompt.available_variables.map((v) => (
                    <span key={v} className="inline-block rounded-full border border-accent/20 bg-accent/5 px-2.5 py-0.5 text-xs font-medium text-accent">{`{{${v}}}`}</span>
                  ))}
                </div>
              ) : null}
              {isEditing ? (
                <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">System 模板</label>
                    <Textarea rows={6} {...form.register('system')} placeholder="System prompt 模板" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">User 模板</label>
                    <Textarea rows={6} {...form.register('user')} placeholder="User prompt 模板" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" loading={upsertMutation.isPending}><Save className="mr-1 h-4 w-4" />保存覆盖</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={handleCancel}>取消</Button>
                  </div>
                </form>
              ) : (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">System</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{prompt.system || '（空）'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">User</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{prompt.user || '（空）'}</p>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}