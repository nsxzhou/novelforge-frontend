import type { AssetType } from '@/shared/api/types'
import { detectContentFormat, parseStructuredContent } from '../schemas/asset-content'
import type { CharacterData } from '../schemas/character-schema'
import type { WorldbuildingData } from '../schemas/worldbuilding-schema'

type AssetContentDisplayProps = {
  content: string
  assetType: AssetType
}

export function AssetContentDisplay({ content, assetType }: AssetContentDisplayProps) {
  const format = detectContentFormat(content, assetType)

  if (format === 'plain') {
    return <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
  }

  const structured = parseStructuredContent(content, assetType)
  if (!structured) {
    return <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
  }

  if (assetType === 'character') {
    return <CharacterDisplay data={structured as CharacterData} />
  }

  return <WorldbuildingDisplay data={structured as WorldbuildingData} />
}

function CharacterDisplay({ data }: { data: CharacterData }) {
  const tags = data.personality_tags?.filter(Boolean) ?? []

  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-foreground">{data.name}</span>
        {data.age ? <span className="text-muted-foreground">{data.age}岁</span> : null}
        {data.gender ? <span className="text-muted-foreground">{data.gender}</span> : null}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {data.motivation ? (
        <FieldDisplay label="动机" value={data.motivation} />
      ) : null}
      {data.appearance ? (
        <FieldDisplay label="外貌" value={data.appearance} />
      ) : null}
      {data.catchphrase ? (
        <FieldDisplay label="口头禅" value={data.catchphrase} />
      ) : null}
      {data.backstory ? (
        <FieldDisplay label="背景" value={data.backstory} />
      ) : null}
      {data.relationships ? (
        <FieldDisplay label="人物关系" value={data.relationships} />
      ) : null}
      {data.notes ? (
        <FieldDisplay label="备注" value={data.notes} />
      ) : null}
    </div>
  )
}

function WorldbuildingDisplay({ data }: { data: WorldbuildingData }) {
  const fields: { key: keyof WorldbuildingData; label: string }[] = [
    { key: 'geography', label: '地理' },
    { key: 'politics', label: '政治' },
    { key: 'magic_system', label: '魔法体系' },
    { key: 'technology_level', label: '科技水平' },
    { key: 'culture', label: '文化' },
    { key: 'history', label: '历史' },
    { key: 'economy', label: '经济' },
    { key: 'religion', label: '宗教' },
    { key: 'notes', label: '备注' },
  ]

  const populated = fields.filter((f) => {
    const v = data[f.key]
    return typeof v === 'string' && v.trim() !== ''
  })

  if (populated.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">暂无结构化内容。</p>
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      {populated.map((f) => (
        <FieldDisplay key={f.key} label={f.label} value={data[f.key] as string} />
      ))}
    </div>
  )
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}：</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  )
}
