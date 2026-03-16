import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FilePenLine, Power, Server } from 'lucide-react'
import {
  addProvider,
  deleteProvider,
  listProviders,
  updateProvider,
} from '@/shared/api/llm-providers'
import { queryKeys } from '@/shared/api/queries'
import type { LLMProvider } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, FormField } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'

const providerSchema = z.object({
  provider: z.string().trim().min(1, '请填写 Provider 名称'),
  model: z.string().trim().min(1, '请填写模型名称'),
  base_url: z.string().trim().min(1, '请填写 Base URL'),
  api_key: z.string().trim(),
  timeout_seconds: z.coerce.number().int().min(1).default(60),
  priority: z.coerce.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
})

type ProviderFormValue = z.infer<typeof providerSchema>

type EditorMode =
  | { type: 'closed' }
  | { type: 'create' }
  | { type: 'edit'; provider: LLMProvider }

const defaultValues: ProviderFormValue = {
  provider: '',
  model: '',
  base_url: '',
  api_key: '',
  timeout_seconds: 60,
  priority: 0,
  enabled: true,
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '····' + key.slice(-4)
}

export function LLMProvidersPanel() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editorMode, setEditorMode] = useState<EditorMode>({ type: 'closed' })
  const [deleteTarget, setDeleteTarget] = useState<LLMProvider | null>(null)
  const [error, setError] = useState<string | null>(null)

  const providersQuery = useQuery({
    queryKey: queryKeys.llmProviders,
    queryFn: listProviders,
  })

  const form = useForm<ProviderFormValue>({
    resolver: zodResolver(providerSchema),
    defaultValues,
  })

  const refreshProviders = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.llmProviders })
  }

  const addMutation = useMutation({
    mutationFn: addProvider,
    onSuccess: async () => {
      await refreshProviders()
      form.reset(defaultValues)
      setEditorMode({ type: 'closed' })
      setError(null)
      toast('Provider 已添加')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProviderFormValue }) =>
      updateProvider(id, input),
    onSuccess: async () => {
      await refreshProviders()
      form.reset(defaultValues)
      setEditorMode({ type: 'closed' })
      setError(null)
      toast('Provider 已更新')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: async () => {
      await refreshProviders()
      setDeleteTarget(null)
      setError(null)
      toast('Provider 已删除')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      updateProvider(id, { enabled }),
    onSuccess: async () => {
      await refreshProviders()
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const isSubmitting = addMutation.isPending || updateMutation.isPending

  function handleSubmit(value: ProviderFormValue) {
    if (editorMode.type === 'create') {
      if (!value.api_key) {
        form.setError('api_key', { message: '请填写 API Key' })
        return
      }
      addMutation.mutate(value)
      return
    }
    if (editorMode.type === 'edit') {
      updateMutation.mutate({ id: editorMode.provider.id, input: value })
    }
  }

  function handleEdit(provider: LLMProvider) {
    setEditorMode({ type: 'edit', provider })
    form.reset({
      provider: provider.provider,
      model: provider.model,
      base_url: provider.base_url,
      api_key: '',
      timeout_seconds: provider.timeout_seconds,
      priority: provider.priority,
      enabled: provider.enabled,
    })
    setError(null)
  }

  function handleCancelEdit() {
    setEditorMode({ type: 'closed' })
    form.reset(defaultValues)
    setError(null)
  }

  function openCreate() {
    setEditorMode({ type: 'create' })
    form.reset(defaultValues)
    setError(null)
  }

  const showForm = editorMode.type !== 'closed'

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg tracking-tight">AI Provider 配置</h2>
          <p className="text-sm text-muted-foreground">管理 LLM 服务商的模型、地址和密钥</p>
        </div>
        {editorMode.type === 'closed' && (
          <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            添加 Provider
          </Button>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <Card variant="elevated">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editorMode.type === 'create' ? '添加新 Provider' : '编辑 Provider'}
            </h3>
          </div>

          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Provider" error={form.formState.errors.provider?.message}>
                <Input {...form.register('provider')} placeholder="例如：openai" />
              </FormField>
              <FormField label="Model" error={form.formState.errors.model?.message}>
                <Input {...form.register('model')} placeholder="例如：gpt-4o" />
              </FormField>
            </div>
            <FormField label="Base URL" error={form.formState.errors.base_url?.message}>
              <Input {...form.register('base_url')} placeholder="https://api.openai.com/v1" />
            </FormField>
            <FormField
              label="API Key"
              description={editorMode.type === 'edit' ? '留空表示不修改' : undefined}
              error={form.formState.errors.api_key?.message}
            >
              <Input type="password" {...form.register('api_key')} placeholder="sk-..." />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Timeout (秒)">
                <Input type="number" min={1} {...form.register('timeout_seconds')} />
              </FormField>
              <FormField label="Priority">
                <Input type="number" min={0} {...form.register('priority')} />
              </FormField>
            </div>

            {error ? <ErrorState text={error} /> : null}

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" loading={isSubmitting} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {editorMode.type === 'create' ? '添加' : '保存修改'}
              </Button>
              <Button type="button" variant="ghost" onClick={handleCancelEdit}>
                取消
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Provider list */}
      {providersQuery.isLoading ? <LoadingState text="加载 Provider 中..." /> : null}
      {providersQuery.error ? <ErrorState text={getErrorMessage(providersQuery.error)} /> : null}

      {providersQuery.data && providersQuery.data.length === 0 ? (
        <EmptyState
          icon={<Server className="h-6 w-6" />}
          title="暂无 Provider"
          description="添加一个 LLM Provider 以开始使用 AI 功能"
          action={
            editorMode.type === 'closed' ? (
              <Button size="sm" onClick={openCreate} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                添加 Provider
              </Button>
            ) : undefined
          }
        />
      ) : null}

      <div className="space-y-3">
        {providersQuery.data?.map((provider) => (
          <Card key={provider.id} padding="md">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold tracking-tight text-foreground truncate">
                    {provider.model}
                  </h3>
                  <Badge variant={provider.enabled ? 'success' : 'default'} dot>
                    {provider.enabled ? '已启用' : '已禁用'}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <span className="font-medium text-stone-500">Provider:</span>
                    {provider.provider}
                  </p>
                  <p className="truncate">
                    <span className="font-medium text-stone-500">URL:</span>{' '}
                    {provider.base_url}
                  </p>
                  <p>
                    <span className="font-medium text-stone-500">Key:</span>{' '}
                    <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[11px]">
                      {maskApiKey(provider.api_key)}
                    </code>
                  </p>
                </div>
                <div className="flex gap-4 text-[11px] text-stone-400">
                  <span>Priority: {provider.priority}</span>
                  <span>Timeout: {provider.timeout_seconds}s</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: provider.id, enabled: !provider.enabled })}
                  leftIcon={<Power className="h-3.5 w-3.5" />}
                >
                  {provider.enabled ? '禁用' : '启用'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(provider)}
                  leftIcon={<FilePenLine className="h-3.5 w-3.5" />}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(provider)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                >
                  删除
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="删除 Provider"
        description={`确定要删除 ${deleteTarget?.provider}/${deleteTarget?.model} 吗？此操作不可撤销。`}
        size="sm"
      >
        {deleteMutation.error && <ErrorState text={getErrorMessage(deleteMutation.error)} />}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            确认删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
