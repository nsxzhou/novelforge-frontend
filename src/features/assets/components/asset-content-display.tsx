import type { AssetType } from '@/shared/api/types'
import { detectContentFormat, parseStructuredContent } from '../schemas/asset-content'
import type { CharacterData } from '../schemas/character-schema'
import type { WorldbuildingData } from '../schemas/worldbuilding-schema'
import type { OutlineData } from '../schemas/outline-schema'

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

  if (assetType === 'outline') {
    return <OutlineDisplay data={structured as OutlineData} />
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

      {tags.length > 0 ? <TagList tags={tags} /> : null}

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

function OutlineDisplay({ data }: { data: OutlineData }) {
  const themes = data.themes?.filter(Boolean) ?? []
  const volumes = data.volumes ?? []

  const hasContent =
    data.premise || themes.length > 0 || data.central_conflict || volumes.length > 0 || data.ending || data.notes

  if (!hasContent) {
    return <p className="mt-3 text-sm text-muted-foreground">暂无结构化内容。</p>
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      {data.premise ? <FieldDisplay label="核心前提" value={data.premise} /> : null}

      {themes.length > 0 ? <TagList label="主题" tags={themes} /> : null}

      {data.central_conflict ? <FieldDisplay label="核心矛盾" value={data.central_conflict} /> : null}

      {volumes.length > 0 ? (
        <div>
          <span className="font-medium text-foreground">分卷规划：</span>
          <div className="mt-1 space-y-1.5 pl-3">
            {volumes.map((vol, i) => (
              <div key={i} className="border-l-2 border-border pl-2">
                <span className="font-medium text-foreground">{vol.title || `第 ${i + 1} 卷`}</span>
                {vol.summary ? (
                  <p className="text-muted-foreground">{vol.summary}</p>
                ) : null}
                {vol.key_events && vol.key_events.filter(Boolean).length > 0 ? (
                  <p className="text-muted-foreground">
                    关键事件：{vol.key_events.filter(Boolean).join('、')}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data.ending ? <FieldDisplay label="结局构想" value={data.ending} /> : null}
      {data.notes ? <FieldDisplay label="备注" value={data.notes} /> : null}
    </div>
  )
}

function TagList({ label, tags }: { label?: string; tags: string[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1">
      {label ? <span className="font-medium text-foreground">{label}：</span> : null}
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
        >
          {tag}
        </span>
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
