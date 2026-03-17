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

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">年龄</label>
          <Input {...register('age')} placeholder="例如：25" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">性别</label>
          <Input {...register('gender')} placeholder="例如：男 / 女 / 其他" />
        </div>
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
        <label className="mb-1 block text-sm font-medium text-foreground">外貌</label>
        <Textarea rows={2} {...register('appearance')} placeholder="外貌描述" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">口头禅</label>
        <Input {...register('catchphrase')} placeholder="角色的口头禅或标志性台词" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">背景故事</label>
        <Textarea rows={3} {...register('backstory')} placeholder="角色的过往经历" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">人物关系</label>
        <Textarea rows={2} {...register('relationships')} placeholder="与其他角色的关系" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">备注</label>
        <Textarea rows={2} {...register('notes')} placeholder="其他补充信息" />
      </div>
    </div>
  )
}
