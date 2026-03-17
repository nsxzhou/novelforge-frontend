import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { outlineSchema, type OutlineData } from '../schemas/outline-schema'
import { parseCommaSeparated } from '../schemas/asset-content'
import { Input, Textarea } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'

type OutlineFormProps = {
  defaultValues: OutlineData
  onChange: (data: OutlineData) => void
}

export function OutlineForm({ defaultValues, onChange }: OutlineFormProps) {
  const { register, handleSubmit, control } = useForm<OutlineData>({
    resolver: zodResolver(outlineSchema),
    defaultValues,
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'volumes' })

  function handleChange() {
    handleSubmit((data) => onChange(data))()
  }

  return (
    <div className="space-y-3" onChange={handleChange}>
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
        <label className="mb-1 block text-sm font-medium text-foreground">分卷规划</label>
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-md border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">第 {index + 1} 卷</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-1.5"
                  onClick={() => { remove(index); handleChange() }}
                  leftIcon={<Trash2 className="h-3 w-3" />}
                >
                  删除
                </Button>
              </div>
              <Input {...register(`volumes.${index}.title`)} placeholder="卷标题" />
              <Textarea rows={2} {...register(`volumes.${index}.summary`)} placeholder="概要" />
              <Input
                {...register(`volumes.${index}.key_events`, {
                  setValueAs: parseCommaSeparated,
                })}
                defaultValue={field.key_events?.join(', ') ?? ''}
                placeholder="关键事件，用逗号分隔"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => { append({ title: '', summary: '', key_events: [] }); handleChange() }}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            添加卷
          </Button>
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
