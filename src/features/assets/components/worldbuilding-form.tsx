import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { worldbuildingSchema, type WorldbuildingData } from '../schemas/worldbuilding-schema'
import { Textarea } from '@/shared/ui/input'

type WorldbuildingFormProps = {
  defaultValues: WorldbuildingData
  onChange: (data: WorldbuildingData) => void
}

export function WorldbuildingForm({ defaultValues, onChange }: WorldbuildingFormProps) {
  const { register, handleSubmit } = useForm<WorldbuildingData>({
    resolver: zodResolver(worldbuildingSchema),
    defaultValues,
    mode: 'onChange',
  })

  function handleChange() {
    handleSubmit((data) => onChange(data))()
  }

  const fields: { name: keyof WorldbuildingData; label: string; placeholder: string }[] = [
    { name: 'geography', label: '地理', placeholder: '地形、气候、重要地标' },
    { name: 'politics', label: '政治', placeholder: '政权结构、重要势力' },
    { name: 'magic_system', label: '魔法体系', placeholder: '魔法规则、能量来源' },
    { name: 'culture', label: '文化', placeholder: '习俗、语言、艺术' },
    { name: 'history', label: '历史', placeholder: '重大历史事件、年表' },
  ]

  return (
    <div className="space-y-3" onChange={handleChange}>
      {fields.map((field) => (
        <div key={field.name}>
          <label className="mb-1 block text-sm font-medium text-foreground">{field.label}</label>
          <Textarea
            rows={2}
            {...register(field.name as 'geography')}
            placeholder={field.placeholder}
          />
        </div>
      ))}
    </div>
  )
}
