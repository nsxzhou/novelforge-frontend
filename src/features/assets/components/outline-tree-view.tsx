import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, ChevronRight, FileText, Plus, ScrollText, Trash2 } from 'lucide-react'
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
import { cn } from '@/shared/lib/cn'

type SelectedNode =
  | { type: 'root' }
  | { type: 'volume'; index: number }
  | { type: 'chapter'; volumeIndex: number; chapterIndex: number }

type OutlineTreeViewProps = {
  defaultValues: OutlineData
  onChange: (data: OutlineData) => void
}

export function OutlineTreeView({ defaultValues, onChange }: OutlineTreeViewProps) {
  const [selected, setSelected] = useState<SelectedNode>({ type: 'root' })
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const form = useForm<OutlineData>({
    resolver: zodResolver(outlineSchema),
    defaultValues: resequenceOutlineOrdinals(defaultValues),
    mode: 'onChange',
  })

  const { register, handleSubmit, control, reset, watch, getValues, setValue } = form
  const volumesFieldArray = useFieldArray({ control, name: 'volumes' })

  useEffect(() => {
    reset(resequenceOutlineOrdinals(defaultValues))
  }, [defaultValues, reset])

  const volumes = watch('volumes')

  // Keep selected node in bounds when data changes
  useEffect(() => {
    if (selected.type === 'volume' && selected.index >= volumes.length) {
      setSelected({ type: 'root' })
    } else if (selected.type === 'chapter') {
      const vol = volumes[selected.volumeIndex]
      if (!vol || selected.chapterIndex >= (vol.chapters?.length ?? 0)) {
        setSelected({ type: 'root' })
      }
    }
  }, [volumes, selected])

  function emitChange() {
    handleSubmit((data) => {
      onChange(resequenceOutlineOrdinals(data))
    })()
  }

  function resequenceAndEmit() {
    const normalized = resequenceOutlineOrdinals(getValues())
    reset(normalized)
    onChange(normalized)
  }

  function toggleCollapse(volumeIndex: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(volumeIndex)) next.delete(volumeIndex)
      else next.add(volumeIndex)
      return next
    })
  }

  function addChapterToVolume(volumeIndex: number) {
    const values = getValues()
    const nextOrdinal = flattenOutlineChapters(values).length + 1
    const updated = [...values.volumes[volumeIndex].chapters, createDefaultChapter(nextOrdinal)]
    setValue(`volumes.${volumeIndex}.chapters`, updated)
    // Expand the volume if collapsed
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(volumeIndex)
      return next
    })
    resequenceAndEmit()
    // Select the new chapter
    setSelected({ type: 'chapter', volumeIndex, chapterIndex: updated.length - 1 })
  }

  function removeChapter(volumeIndex: number, chapterIndex: number) {
    const values = getValues()
    const chapters = values.volumes[volumeIndex].chapters
    if (chapters.length <= 1) return
    setValue(
      `volumes.${volumeIndex}.chapters`,
      chapters.filter((_, i) => i !== chapterIndex),
    )
    setSelected({ type: 'volume', index: volumeIndex })
    resequenceAndEmit()
  }

  function removeVolume(volumeIndex: number) {
    if (volumesFieldArray.fields.length <= 1) return
    volumesFieldArray.remove(volumeIndex)
    setSelected({ type: 'root' })
    resequenceAndEmit()
  }

  function addVolume() {
    const values = getValues()
    const nextOrdinal = flattenOutlineChapters(values).length + 1
    volumesFieldArray.append(createDefaultVolume(nextOrdinal))
    resequenceAndEmit()
    setSelected({ type: 'volume', index: volumesFieldArray.fields.length })
  }

  return (
    <div className="flex rounded-xl border border-border overflow-hidden" style={{ minHeight: 480 }}>
      {/* ── Tree panel ── */}
      <div className="w-[250px] shrink-0 border-r border-border bg-[#FBFCFE] overflow-y-auto">
        <div className="py-2">
          {/* Root */}
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors',
              selected.type === 'root'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
            onClick={() => setSelected({ type: 'root' })}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>大纲总览</span>
          </button>

          {/* Volumes */}
          {volumesFieldArray.fields.map((field, vi) => {
            const isCollapsed = collapsed.has(vi)
            const vol = volumes[vi]
            const volumeTitle = vol?.title || `分卷 ${vi + 1}`
            const chapters = vol?.chapters ?? []

            return (
              <div key={field.id}>
                {/* Volume row */}
                <div className="flex items-center">
                  <button
                    type="button"
                    className="flex h-8 w-6 shrink-0 items-center justify-center text-muted-foreground"
                    onClick={() => toggleCollapse(vi)}
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3 w-3" />
                      : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex flex-1 items-center gap-2 px-2 py-1.5 text-sm transition-colors',
                      selected.type === 'volume' && selected.index === vi
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => setSelected({ type: 'volume', index: vi })}
                  >
                    <ScrollText className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{volumeTitle}</span>
                  </button>
                </div>

                {/* Chapters */}
                {!isCollapsed && chapters.map((ch, ci) => (
                  <button
                    key={`${field.id}-ch-${ci}`}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 py-1.5 pl-10 pr-4 text-sm transition-colors',
                      selected.type === 'chapter' && selected.volumeIndex === vi && selected.chapterIndex === ci
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )}
                    onClick={() => setSelected({ type: 'chapter', volumeIndex: vi, chapterIndex: ci })}
                  >
                    <span className="truncate">第 {ch.ordinal} 章 {ch.title || '未命名'}</span>
                  </button>
                ))}

                {/* Add chapter (inline) */}
                {!isCollapsed && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 py-1 pl-10 pr-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => addChapterToVolume(vi)}
                  >
                    <Plus className="h-3 w-3" />
                    <span>添加章节</span>
                  </button>
                )}
              </div>
            )
          })}

          {/* Add volume */}
          <div className="px-4 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={addVolume}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
            >
              添加分卷
            </Button>
          </div>
        </div>
      </div>

      {/* ── Editor panel ── */}
      <div className="flex-1 overflow-y-auto p-5" onChange={emitChange}>
        {selected.type === 'root' && <RootEditor register={register} defaultThemes={defaultValues.themes} />}
        {selected.type === 'volume' && (
          <VolumeEditor
            volumeIndex={selected.index}
            volumeTitle={volumes[selected.index]?.title}
            register={register}
            canRemove={volumesFieldArray.fields.length > 1}
            onRemove={() => removeVolume(selected.index)}
          />
        )}
        {selected.type === 'chapter' && (
          <ChapterEditor
            volumeIndex={selected.volumeIndex}
            chapterIndex={selected.chapterIndex}
            ordinal={volumes[selected.volumeIndex]?.chapters?.[selected.chapterIndex]?.ordinal}
            register={register}
            canRemove={(volumes[selected.volumeIndex]?.chapters?.length ?? 0) > 1}
            onRemove={() => removeChapter(selected.volumeIndex, selected.chapterIndex)}
          />
        )}
      </div>
    </div>
  )
}

/* ── Sub-editors ── */

type RegisterFn = ReturnType<typeof useForm<OutlineData>>['register']

function RootEditor({ register, defaultThemes }: { register: RegisterFn; defaultThemes?: string[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">大纲总览</h3>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">核心前提</label>
        <Textarea rows={2} {...register('premise')} placeholder="一句话概括故事核心" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">主题</label>
        <Input
          {...register('themes', { setValueAs: parseCommaSeparated })}
          defaultValue={defaultThemes?.join(', ') ?? ''}
          placeholder="用逗号分隔，例如：成长, 复仇, 救赎"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">核心矛盾</label>
        <Textarea rows={2} {...register('central_conflict')} placeholder="推动故事发展的核心矛盾" />
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

function VolumeEditor({
  volumeIndex: vi,
  volumeTitle,
  register,
  canRemove,
  onRemove,
}: {
  volumeIndex: number
  volumeTitle?: string
  register: RegisterFn
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          {volumeTitle || `分卷 ${vi + 1}`}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          disabled={!canRemove}
          onClick={onRemove}
          leftIcon={<Trash2 className="h-3 w-3" />}
        >
          删除分卷
        </Button>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">分卷标题</label>
        <Input {...register(`volumes.${vi}.title`)} placeholder="分卷标题，例如：第一卷 迷雾初启" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">分卷概要</label>
        <Textarea rows={3} {...register(`volumes.${vi}.summary`)} placeholder="这一卷的主线推进与阶段目标" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">关键事件</label>
        <Input
          {...register(`volumes.${vi}.key_events`, { setValueAs: parseCommaSeparated })}
          placeholder="卷级关键事件，用逗号分隔"
        />
      </div>
    </div>
  )
}

function ChapterEditor({
  volumeIndex: vi,
  chapterIndex: ci,
  ordinal,
  register,
  canRemove,
  onRemove,
}: {
  volumeIndex: number
  chapterIndex: number
  ordinal?: number
  register: RegisterFn
  canRemove: boolean
  onRemove: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">第 {ordinal ?? '?'} 章</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          disabled={!canRemove}
          onClick={onRemove}
          leftIcon={<Trash2 className="h-3 w-3" />}
        >
          删除章节
        </Button>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">章节序号</label>
        <Input value={String(ordinal ?? '')} readOnly disabled />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">章节标题</label>
        <Input {...register(`volumes.${vi}.chapters.${ci}.title`)} placeholder="章节标题" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">章节概要</label>
        <Textarea rows={3} {...register(`volumes.${vi}.chapters.${ci}.summary`)} placeholder="章节概要" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">本章目的</label>
        <Textarea rows={2} {...register(`volumes.${vi}.chapters.${ci}.purpose`)} placeholder="本章目的，例如建立冲突、推进真相" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">必须包含元素</label>
        <Input
          {...register(`volumes.${vi}.chapters.${ci}.must_include`, { setValueAs: parseCommaSeparated })}
          placeholder="必须包含元素，用逗号分隔"
        />
      </div>
    </div>
  )
}
