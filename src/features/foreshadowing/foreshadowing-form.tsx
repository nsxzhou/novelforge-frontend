import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { createForeshadowing, updateForeshadowing, deleteForeshadowing } from '@/shared/api/foreshadowing'
import type { CreateForeshadowingInput, UpdateForeshadowingInput } from '@/shared/api/foreshadowing'
import { invalidateForeshadowings } from '@/shared/api/query-invalidation'
import type { Foreshadowing, Chapter, ForeshadowingStatus } from '@/shared/api/types'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input, Select, Textarea, FormField } from '@/shared/ui/input'
import { useToast } from '@/shared/ui/toast'
import { getErrorMessage } from '@/shared/lib/error-message'

type ForeshadowingFormProps = {
  projectId: string
  chapters: Chapter[]
  foreshadowing?: Foreshadowing | null
  open: boolean
  onClose: () => void
}

export function ForeshadowingForm({
  projectId,
  chapters,
  foreshadowing,
  open,
  onClose,
}: ForeshadowingFormProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const isEditing = Boolean(foreshadowing)

  const [title, setTitle] = useState(foreshadowing?.title ?? '')
  const [description, setDescription] = useState(foreshadowing?.description ?? '')
  const [chapterPlantedId, setChapterPlantedId] = useState(foreshadowing?.chapter_planted_id ?? '')
  const [chapterExpectedResolveId, setChapterExpectedResolveId] = useState(foreshadowing?.chapter_expected_resolve_id ?? '')
  const [chapterActualResolveId, setChapterActualResolveId] = useState(foreshadowing?.chapter_actual_resolve_id ?? '')
  const [status, setStatus] = useState<ForeshadowingStatus>(foreshadowing?.status ?? 'planted')

  const sortedChapters = [...chapters].sort((a, b) => a.ordinal - b.ordinal)

  const createMutation = useMutation({
    mutationFn: (input: CreateForeshadowingInput) => createForeshadowing(projectId, input),
    onSuccess: async () => {
      await invalidateForeshadowings(queryClient, projectId)
      toast('伏笔已创建')
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: UpdateForeshadowingInput) =>
      updateForeshadowing(projectId, foreshadowing!.id, input),
    onSuccess: async () => {
      await invalidateForeshadowings(queryClient, projectId)
      toast('伏笔已更新')
      onClose()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteForeshadowing(projectId, foreshadowing!.id),
    onSuccess: async () => {
      await invalidateForeshadowings(queryClient, projectId)
      toast('伏笔已删除')
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !chapterPlantedId) return

    if (isEditing) {
      updateMutation.mutate({
        title: title.trim(),
        description: description.trim(),
        chapter_planted_id: chapterPlantedId,
        chapter_expected_resolve_id: chapterExpectedResolveId || undefined,
        chapter_actual_resolve_id: chapterActualResolveId || undefined,
        status,
      })
    } else {
      createMutation.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
        chapter_planted_id: chapterPlantedId,
        chapter_expected_resolve_id: chapterExpectedResolveId || undefined,
        status,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const error = createMutation.error || updateMutation.error || deleteMutation.error

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? '编辑伏笔' : '新增伏笔'}
      description={isEditing ? '修改伏笔的详细信息' : '添加一条新的伏笔线索'}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField label="标题" required>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="伏笔标题"
          />
        </FormField>

        <FormField label="描述">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="伏笔的详细描述"
          />
        </FormField>

        <FormField label="埋设章节" required>
          <Select
            value={chapterPlantedId}
            onChange={(e) => setChapterPlantedId(e.target.value)}
          >
            <option value="">请选择章节</option>
            {sortedChapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                第{ch.ordinal}章 · {ch.title}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="预期揭示章节">
          <Select
            value={chapterExpectedResolveId}
            onChange={(e) => setChapterExpectedResolveId(e.target.value)}
          >
            <option value="">未指定</option>
            {sortedChapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                第{ch.ordinal}章 · {ch.title}
              </option>
            ))}
          </Select>
        </FormField>

        {isEditing && (
          <FormField label="实际揭示章节">
            <Select
              value={chapterActualResolveId}
              onChange={(e) => setChapterActualResolveId(e.target.value)}
            >
              <option value="">未揭示</option>
              {sortedChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  第{ch.ordinal}章 · {ch.title}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <FormField label="状态">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as ForeshadowingStatus)}
          >
            <option value="planted">已埋设</option>
            <option value="resolved">已揭示</option>
            <option value="overdue">逾期</option>
          </Select>
        </FormField>

        {error && (
          <p className="text-xs font-medium text-red-600">{getErrorMessage(error)}</p>
        )}

        <DialogFooter>
          {isEditing && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              className="mr-auto"
            >
              删除
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            type="submit"
            loading={createMutation.isPending || updateMutation.isPending}
            disabled={!title.trim() || !chapterPlantedId || isPending}
          >
            {isEditing ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
