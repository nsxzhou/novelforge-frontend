import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, RotateCcw, Save } from 'lucide-react'
import { motion } from 'framer-motion'
import { deletePrompt, listPrompts, upsertPrompt } from '@/shared/api/prompts'
import { queryKeys } from '@/shared/api/queries'
import type { PromptTemplate } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Textarea, FormField } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { EmptyState } from '@/shared/ui/empty-state'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants } from '@/shared/lib/motion'

const promptSchema = z.object({
  system: z.string().trim().min(1, '请填写 system 模板'),
  user: z.string().trim().min(1, '请填写 user 模板'),
})

type PromptFormValue = z.infer<typeof promptSchema>

const capabilityLabels: Record<string, string> = {
  asset_generation: '资产生成',
  chapter_generation: '章节生成',
  chapter_continuation: '章节续写',
  chapter_rewrite: '章节改写',
  project_guided_candidates: '组合式创建候选',
}

function getCapabilityLabel(capability: string): string {
  return capabilityLabels[capability] ?? capability
}

export function PromptsPanel({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [editingCapability, setEditingCapability] = useState<string | null>(null)
  const [resetTarget, setResetTarget] = useState<string | null>(null)
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
      toast('模板已保存')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (capability: string) => deletePrompt(projectId, capability),
    onSuccess: async () => {
      await refreshPrompts()
      setResetTarget(null)
      setEditingCapability(null)
      setError(null)
      toast('已重置为默认模板')
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

      {error && <ErrorState text={error} />}
      {promptsQuery.isLoading && <LoadingState text="加载模板中..." />}
      {promptsQuery.error && <ErrorState text={getErrorMessage(promptsQuery.error)} />}

      {prompts.length === 0 && !promptsQuery.isLoading && (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="暂无 Prompt 模板"
          description="项目没有可用的 Prompt 模板"
        />
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants.staggerChildren}
        className="space-y-4"
      >
        {prompts.map((prompt) => {
          const isEditing = editingCapability === prompt.capability
          return (
            <motion.div key={prompt.capability} variants={variants.fadeInUp} transition={{ duration: 0.15 }}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium tracking-tight">{getCapabilityLabel(prompt.capability)}</h3>
                      <Badge variant={prompt.is_override ? 'warning' : 'default'} dot className="mt-0.5">
                        {prompt.is_override ? '已覆盖' : '默认'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {!isEditing && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(prompt)}>
                        编辑
                      </Button>
                    )}
                    {prompt.is_override && !isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetTarget(prompt.capability)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      >
                        重置
                      </Button>
                    )}
                  </div>
                </div>

                {/* Variable badges */}
                {prompt.available_variables.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {prompt.available_variables.map((v) => (
                      <Badge key={v} variant="default" className="font-mono text-[11px]">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}

                {isEditing ? (
                    <motion.form
                      key="edit"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-3"
                      onSubmit={form.handleSubmit(handleSubmit)}
                    >
                      <FormField label="System 模板">
                        <Textarea rows={6} {...form.register('system')} placeholder="System prompt 模板" className="font-mono text-xs" />
                      </FormField>
                      <FormField label="User 模板">
                        <Textarea rows={6} {...form.register('user')} placeholder="User prompt 模板" className="font-mono text-xs" />
                      </FormField>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" loading={upsertMutation.isPending} leftIcon={<Save className="h-3.5 w-3.5" />}>
                          保存覆盖
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>取消</Button>
                      </div>
                    </motion.form>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">System</p>
                        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 text-xs text-foreground font-mono leading-relaxed max-h-40 overflow-y-auto">
                          {prompt.system || '（空）'}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">User</p>
                        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted p-3 text-xs text-foreground font-mono leading-relaxed max-h-40 overflow-y-auto">
                          {prompt.user || '（空）'}
                        </div>
                      </div>
                    </div>
                  )}
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title="重置模板"
        description="确定要将此模板重置为默认值吗？自定义内容将丢失。"
        size="sm"
      >
        <DialogFooter>
          <Button variant="ghost" onClick={() => setResetTarget(null)}>取消</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => resetTarget && deleteMutation.mutate(resetTarget)}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
          >
            确认重置
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
