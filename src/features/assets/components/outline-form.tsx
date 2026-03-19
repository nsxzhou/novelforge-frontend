import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, ScrollText, Trash2 } from 'lucide-react'
import {
  createDefaultChapter,
  createDefaultVolume,
  flattenOutlineChapters,
  outlineSchema,
  resequenceOutlineOrdinals,
  type OutlineData,
} from '../schemas/outline-schema'
import { parseCommaSeparated } from '../schemas/asset-content'
import { Input, Textarea } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'

type OutlineFormProps = {
  defaultValues: OutlineData
  onChange: (data: OutlineData) => void
}

type OutlineVolumeFieldsProps = {
  volumeIndex: number
  onChange: () => void
  removeVolume: (index: number) => void
  canRemoveVolume: boolean
  getNextChapterOrdinal: () => number
  control: ReturnType<typeof useForm<OutlineData>>['control']
  register: ReturnType<typeof useForm<OutlineData>>['register']
}

function OutlineVolumeFields({
  volumeIndex,
  onChange,
  removeVolume,
  canRemoveVolume,
  getNextChapterOrdinal,
  control,
  register,
}: OutlineVolumeFieldsProps) {
  const chaptersFieldArray = useFieldArray({
    control,
    name: `volumes.${volumeIndex}.chapters` as const,
  })

  return (
    <div className="rounded-xl border border-border bg-[#FBFCFE] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E2E8F0] text-foreground">
            <ScrollText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">分卷 {volumeIndex + 1}</p>
            <p className="text-xs text-muted-foreground">卷级摘要与章节计划</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
          disabled={!canRemoveVolume}
          onClick={() => {
            removeVolume(volumeIndex)
            onChange()
          }}
          leftIcon={<Trash2 className="h-3 w-3" />}
        >
          删除分卷
        </Button>
      </div>

      <Input
        {...register(`volumes.${volumeIndex}.title` as const)}
        placeholder="分卷标题，例如：第一卷 迷雾初启"
      />
      <Textarea
        rows={2}
        {...register(`volumes.${volumeIndex}.summary` as const)}
        placeholder="这一卷的主线推进与阶段目标"
      />
      <Input
        {...register(`volumes.${volumeIndex}.key_events` as const, {
          setValueAs: parseCommaSeparated,
        })}
        placeholder="卷级关键事件，用逗号分隔"
      />

      <div className="space-y-3 border-t border-border pt-3">
        {chaptersFieldArray.fields.map((field, chapterIndex) => (
          <div key={field.id} className="rounded-lg border border-border bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-muted-foreground">
                第 {field.ordinal} 章
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-1.5"
                disabled={chaptersFieldArray.fields.length <= 1}
                onClick={() => {
                  chaptersFieldArray.remove(chapterIndex)
                  onChange()
                }}
                leftIcon={<Trash2 className="h-3 w-3" />}
              >
                删除
              </Button>
            </div>

            <Input
              value={String(field.ordinal)}
              readOnly
              disabled
              placeholder="章节序号"
            />
            <Input
              {...register(`volumes.${volumeIndex}.chapters.${chapterIndex}.title` as const)}
              placeholder="章节标题"
            />
            <Textarea
              rows={2}
              {...register(`volumes.${volumeIndex}.chapters.${chapterIndex}.summary` as const)}
              placeholder="章节概要"
            />
            <Textarea
              rows={2}
              {...register(`volumes.${volumeIndex}.chapters.${chapterIndex}.purpose` as const)}
              placeholder="本章目的，例如建立冲突、推进真相"
            />
            <Input
              {...register(`volumes.${volumeIndex}.chapters.${chapterIndex}.must_include` as const, {
                setValueAs: parseCommaSeparated,
              })}
              placeholder="必须包含元素，用逗号分隔"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            chaptersFieldArray.append(createDefaultChapter(getNextChapterOrdinal()))
            onChange()
          }}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          添加章节
        </Button>
      </div>
    </div>
  )
}

export function OutlineForm({ defaultValues, onChange }: OutlineFormProps) {
  const form = useForm<OutlineData>({
    resolver: zodResolver(outlineSchema),
    defaultValues: resequenceOutlineOrdinals(defaultValues),
    mode: 'onChange',
  })

  const { register, handleSubmit, control, reset, watch } = form
  const volumesFieldArray = useFieldArray({ control, name: 'volumes' })

  useEffect(() => {
    reset(resequenceOutlineOrdinals(defaultValues))
  }, [defaultValues, reset])

  function emitChange() {
    handleSubmit((data) => {
      onChange(resequenceOutlineOrdinals(data))
    })()
  }

  return (
    <div className="space-y-4" onChange={emitChange}>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">核心前提</label>
        <Textarea rows={2} {...register('premise')} placeholder="一句话概括故事核心" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">主题</label>
        <Input
          {...register('themes', {
            setValueAs: parseCommaSeparated,
          })}
          defaultValue={defaultValues.themes?.join(', ') ?? ''}
          placeholder="用逗号分隔，例如：成长, 复仇, 救赎"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">核心矛盾</label>
        <Textarea rows={2} {...register('central_conflict')} placeholder="推动故事发展的核心矛盾" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-foreground">分卷规划</label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              volumesFieldArray.append(createDefaultVolume(flattenOutlineChapters(watch()).length + 1))
              emitChange()
            }}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            添加分卷
          </Button>
        </div>

        <div className="space-y-4">
          {volumesFieldArray.fields.map((field, volumeIndex) => (
            <OutlineVolumeFields
              key={field.id}
              volumeIndex={volumeIndex}
              onChange={() => {
                const normalized = resequenceOutlineOrdinals(watch())
                reset(normalized)
                onChange(normalized)
              }}
              removeVolume={volumesFieldArray.remove}
              canRemoveVolume={volumesFieldArray.fields.length > 1}
              getNextChapterOrdinal={() => flattenOutlineChapters(watch()).length + 1}
              control={control}
              register={register}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">结局构想</label>
        <Textarea rows={2} {...register('ending')} placeholder="故事的结局设想" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">备注</label>
        <Textarea rows={2} {...register('notes')} placeholder="其他补充信息" />
      </div>
    </div>
  )
}
