import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { GuidedProjectInput } from '@/shared/api/projects'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/input'
import { ChipSelect } from './chip-select'

const genreOptions = ['悬疑', '科幻', '奇幻', '古言', '都市', '赛博朋克', '武侠', '修仙', '末日', '校园']
const settingOptions = ['近未来都市', '废弃空间站', '古代王朝', '学院世界', '末日废土', '架空大陆', '异世界', '地下城市']
const protagonistOptions = ['失忆幸存者', '冷面调查者', '落魄天才', '被迫继承者', '局外观察者', '叛逃者', '双面卧底', '觉醒少年']
const conflictOptions = ['真相追索', '身份反转', '权力争夺', '生存倒计时', '关系背叛', '规则失控', '文明碰撞', '复仇之路']
const toneOptions = ['冷峻悬疑', '压迫惊悚', '浪漫克制', '宏大史诗', '黑色幽默', '明亮热血', '哥特暗黑', '清新治愈']

type StepConditionsProps = {
  onSubmit: (input: GuidedProjectInput) => void
  onManualCreate: () => void
  isLoading?: boolean
}

export function StepConditions({ onSubmit, onManualCreate, isLoading }: StepConditionsProps) {
  const [genre, setGenre] = useState(genreOptions[0])
  const [setting, setSetting] = useState(settingOptions[0])
  const [protagonistArchetype, setProtagonistArchetype] = useState(protagonistOptions[0])
  const [coreConflict, setCoreConflict] = useState(conflictOptions[0])
  const [tone, setTone] = useState(toneOptions[0])
  const [customNote, setCustomNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      genre,
      setting,
      protagonist_archetype: protagonistArchetype,
      core_conflict: coreConflict,
      tone,
      custom_note: customNote.trim() || undefined,
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F172A] text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-medium tracking-tight text-foreground">组合条件</h2>
          <p className="text-xs text-muted-foreground">选择五个维度，AI 团队将展开头脑风暴</p>
        </div>
      </div>

      <ChipSelect label="题材" options={genreOptions} value={genre} onChange={setGenre} allowCustom />
      <ChipSelect label="时代 / 世界" options={settingOptions} value={setting} onChange={setSetting} allowCustom />
      <ChipSelect label="主角原型" options={protagonistOptions} value={protagonistArchetype} onChange={setProtagonistArchetype} allowCustom />
      <ChipSelect label="核心冲突" options={conflictOptions} value={coreConflict} onChange={setCoreConflict} allowCustom />
      <ChipSelect label="氛围风格" options={toneOptions} value={tone} onChange={setTone} allowCustom />

      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">补充说明</p>
        <Textarea
          rows={3}
          showCount
          maxLength={240}
          placeholder="可选。补充你特别想保留的元素，例如：希望结尾有强烈身份反转，但情感线要克制。"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={isLoading} leftIcon={<Sparkles className="h-4 w-4" />}>
          开始头脑风暴
        </Button>
        <button
          type="button"
          onClick={onManualCreate}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          改为手动创建
        </button>
      </div>
    </form>
  )
}
