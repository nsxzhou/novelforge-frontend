import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { characterSchema, type CharacterData } from '../schemas/character-schema'
import { parseCommaSeparated } from '../schemas/asset-content'
import { Input, Textarea } from '@/shared/ui/input'

type CharacterFormProps = {
  defaultValues: CharacterData
  onChange: (data: CharacterData) => void
}

export function CharacterForm({ defaultValues, onChange }: CharacterFormProps) {
  const { register, handleSubmit, formState } = useForm<CharacterData>({
    resolver: zodResolver(characterSchema),
    defaultValues,
    mode: 'onChange',
  })

  // Propagate changes on every valid change
  function handleChange() {
    handleSubmit((data) => onChange(data))()
  }

  return (
    <div className="space-y-3" onChange={handleChange}>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          姓名 <span className="text-red-500">*</span>
        </label>
        <Input {...register('name')} placeholder="角色姓名" />
        {formState.errors.name ? (
          <p className="mt-1 text-xs text-red-600">{formState.errors.name.message}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">性别</label>
        <Input {...register('gender')} placeholder="例如：男、女" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">性格标签</label>
        <Input
          {...register('personality_tags', {
            setValueAs: parseCommaSeparated,
          })}
          defaultValue={defaultValues.personality_tags?.join(', ') ?? ''}
          placeholder="用逗号分隔，例如：勇敢, 固执, 善良"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">动机</label>
        <Textarea rows={2} {...register('motivation')} placeholder="角色的核心动机" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">背景故事</label>
        <Textarea rows={3} {...register('backstory')} placeholder="角色的过往经历" />
      </div>
    </div>
  )
}
