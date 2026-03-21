import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { WandSparkles } from 'lucide-react'
import { listAllAssets } from '@/shared/api/assets'
import { listAllChapters } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import { detectContentFormat, parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { Button } from '@/shared/ui/button'
import { Select, Textarea, FormField } from '@/shared/ui/input'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'

const createSchema = z.object({
  ordinal: z.coerce.number().int().min(1, '请选择章节计划'),
  instruction: z.string().trim().optional(),
  pov_character: z.string().optional(),
})

export type CreateChapterFormValue = z.infer<typeof createSchema>

type CreateChapterDialogProps = {
  projectId: string
  open: boolean
  onClose: () => void
  onSubmit: (value: CreateChapterFormValue) => void
  isSubmitting: boolean
}

export function CreateChapterDialog({
  projectId,
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateChapterDialogProps) {
  const form = useForm<CreateChapterFormValue>({
    resolver: zodResolver(createSchema),
    defaultValues: { ordinal: 1, instruction: '', pov_character: '' },
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
  })

  const assetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAllAssets({ projectId }),
  })

  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
  )

  const outlineData = useMemo(() => {
    const outlineAsset = (assetsQuery.data ?? []).find((a) => a.type === 'outline')
    if (!outlineAsset) return null
    const isStructured = outlineAsset.content_schema === 'outline_v2'
      || detectContentFormat(outlineAsset.content, 'outline') === 'structured'
    if (!isStructured) return null
    return parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
  }, [assetsQuery.data])

  const characterNames = useMemo(
    () => (assetsQuery.data ?? []).filter((a) => a.type === 'character').map((a) => a.title),
    [assetsQuery.data],
  )

  const plannedChapters = useMemo(
    () => flattenOutlineChapters(outlineData),
    [outlineData],
  )

  const unwrittenPlannedChapters = useMemo(
    () => plannedChapters.filter((p) => !chapters.some((c) => c.ordinal === p.ordinal)),
    [plannedChapters, chapters],
  )

  const selectedPlannedOrdinal = form.watch('ordinal')

  useEffect(() => {
    if (open && unwrittenPlannedChapters.length > 0) {
      form.setValue('ordinal', unwrittenPlannedChapters[0].ordinal)
    }
  }, [form, open, unwrittenPlannedChapters])

  function handleSubmit(value: CreateChapterFormValue) {
    onSubmit({
      ...value,
      instruction: value.instruction?.trim() ? value.instruction.trim() : undefined,
    })
    const nextOrdinal = unwrittenPlannedChapters.find((c) => c.ordinal !== value.ordinal)?.ordinal ?? value.ordinal
    form.reset({ ordinal: nextOrdinal, instruction: '' })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="生成新章节"
      description={
        unwrittenPlannedChapters.length > 0
          ? '从大纲计划中选择尚未写作的章节，再补充本章创作要求。'
          : '请先在大纲中规划章节，随后按计划生成正文。'
      }
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          label="章节计划"
          error={form.formState.errors.ordinal?.message}
          description={unwrittenPlannedChapters.length > 0 ? '标题由大纲计划提供，生成时按所选章节序号创建。' : undefined}
        >
          <Select
            {...form.register('ordinal')}
            disabled={unwrittenPlannedChapters.length === 0}
          >
            {unwrittenPlannedChapters.length === 0 ? (
              <option value="0">暂无可写章节</option>
            ) : null}
            {unwrittenPlannedChapters.map((chapter) => (
              <option key={chapter.ordinal} value={chapter.ordinal}>
                第{chapter.ordinal}章 · {chapter.title || '未命名章节'}
              </option>
            ))}
          </Select>
        </FormField>
        {unwrittenPlannedChapters.length > 0 ? (
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-muted-foreground">
            {(() => {
              const selected = unwrittenPlannedChapters.find(
                (c) => c.ordinal === Number(selectedPlannedOrdinal),
              ) ?? unwrittenPlannedChapters[0]
              return selected?.summary ? selected.summary : '该章节暂无摘要，可直接用创作要求补充细节。'
            })()}
          </div>
        ) : null}
        {characterNames.length > 0 && (
          <FormField label="视角角色">
            <Select {...form.register('pov_character')}>
              <option value="">全知视角</option>
              {characterNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </FormField>
        )}
        <FormField label="创作要求" error={form.formState.errors.instruction?.message}>
          <Textarea rows={4} {...form.register('instruction')} placeholder="可选。留空则依据大纲章节计划自动生成" />
        </FormField>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={isSubmitting || unwrittenPlannedChapters.length === 0} leftIcon={<WandSparkles className="h-3.5 w-3.5" />}>
            生成章节
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
