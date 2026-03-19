import { RELATION_TYPES } from '@/shared/api/types'

export function RelationLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-white p-3">
      <span className="text-xs text-muted-foreground">关系类型：</span>
      {RELATION_TYPES.filter((t) => t.value !== 'custom').map((type) => (
        <div key={type.value} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: type.color }}
          />
          <span className="text-xs text-foreground">{type.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
        <span className="text-xs text-foreground">自定义</span>
      </div>
    </div>
  )
}
