import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, FilePenLine, Power } from 'lucide-react'
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
import { Input } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { getErrorMessage } from '@/shared/lib/error-message'

const providerSchema = z.object({
  provider: z.string().trim().min(1, '请填写 Provider 名称'),
  model: z.string().trim().min(1, '请填写模型名称'),
  base_url: z.string().trim().min(1, '请填写 Base URL'),
  api_key: z.string().trim().min(1, '请填写 API Key'),
  timeout_seconds: z.coerce.number().int().min(1).default(60),
  priority: z.coerce.number().int().min(0).default(0),
  enabled: z.boolean().default(true),
})

type ProviderFormValue = z.infer<typeof providerSchema>

type EditorMode =
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
  return key.slice(0, 4) + '****' + key.slice(-4)
}

export function LLMProvidersPanel() {
  const queryClient = useQueryClient()
  const [editorMode, setEditorMode] = useState<EditorMode>({ type: 'create' })
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
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProviderFormValue }) =>
      updateProvider(id, input),
    onSuccess: async () => {
      await refreshProviders()
      form.reset(defaultValues)
      setEditorMode({ type: 'create' })
      setError(null)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProvider,
    onSuccess: async () => {
      await refreshProviders()
      setError(null)
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
      addMutation.mutate(value)
      return
    }
    updateMutation.mutate({ id: editorMode.provider.id, input: value })
  }

  function handleEdit(provider: LLMProvider) {
    setEditorMode({ type: 'edit', provider })
    form.reset({
      provider: provider.provider,
      model: provider.model,
      base_url: provider.base_url,
      api_key: provider.api_key,
      timeout_seconds: provider.timeout_seconds,
      priority: provider.priority,
      enabled: provider.enabled,
    })
    setError(null)
  }

  function handleCancelEdit() {
    setEditorMode({ type: 'create' })
    form.reset(defaultValues)
    setError(null)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="h-fit">
        <SectionTitle
          eyebrow="Config"
          title={editorMode.type === 'create' ? '添加 Provider' : '编辑 Provider'}
          description="配置 LLM 服务商的模型、地址和密钥。"
        />

        <form className="space-y-3" onSubmit={form.handleSubmit(handleSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Provider</label>
            <Input {...form.register('provider')} placeholder="例如：openai" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Model</label>
            <Input {...form.register('model')} placeholder="例如：gpt-4o" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Base URL</label>
            <Input {...form.register('base_url')} placeholder="https://api.openai.com/v1" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">API Key</label>
            <Input type="password" {...form.register('api_key')} placeholder="sk-..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Timeout (s)</label>
              <Input type="number" min={1} {...form.register('timeout_seconds')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Priority</label>
              <Input type="number" min={0} {...form.register('priority')} />
            </div>
          </div>

          {error ? <ErrorState text={error} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              <Plus className="mr-1 h-4 w-4" />
              {editorMode.type === 'create' ? '添加' : '保存修改'}
            </Button>
            {editorMode.type === 'edit' ? (
              <Button type="button" variant="secondary" size="sm" onClick={handleCancelEdit}>
                取消编辑
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Providers"
          title="Provider 列表"
          description="管理已配置的 LLM Provider。"
        />

        {providersQuery.isLoading ? <LoadingState text="加载 Provider 中..." /> : null}
        {providersQuery.error ? <ErrorState text={getErrorMessage(providersQuery.error)} /> : null}

        {providersQuery.data && providersQuery.data.length === 0 ? (
          <p className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">暂无 Provider，请在左侧添加。</p>
        ) : null}

        <div className="space-y-3">
          {providersQuery.data?.map((provider) => (
            <Card key={provider.id} interactive padding="md">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {provider.provider} / {provider.model}
                  </h3>
                  <p className="text-xs text-muted-foreground break-all">{provider.base_url}</p>
                  <p className="text-xs text-muted-foreground">API Key: {maskApiKey(provider.api_key)}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Priority: {provider.priority}</span>
                    <span>Timeout: {provider.timeout_seconds}s</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={provider.enabled ? 'secondary' : 'outline'}
                    size="sm"
                    loading={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ id: provider.id, enabled: !provider.enabled })}
                  >
                    <Power className="mr-1 h-4 w-4" />
                    {provider.enabled ? '禁用' : '启用'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleEdit(provider)}>
                    <FilePenLine className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(provider.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    删除
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    provider.enabled
                      ? 'border border-accent/20 bg-accent/5 text-accent'
                      : 'border border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${provider.enabled ? 'bg-accent' : 'bg-muted-foreground'}`} />
                  {provider.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  )
}
