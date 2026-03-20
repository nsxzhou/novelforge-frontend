import { useMemo } from 'react'
import type { Foreshadowing, Chapter } from '@/shared/api/types'
import { cn } from '@/shared/lib/cn'

const STATUS_COLORS: Record<string, string> = {
  planted: '#3B82F6',
  resolved: '#10B981',
  overdue: '#EF4444',
}

const STATUS_BG: Record<string, string> = {
  planted: 'bg-blue-50',
  resolved: 'bg-emerald-50',
  overdue: 'bg-red-50',
}

const STATUS_LABELS: Record<string, string> = {
  planted: '已埋设',
  resolved: '已揭示',
  overdue: '逾期',
}

type ForeshadowingTimelineProps = {
  foreshadowings: Foreshadowing[]
  chapters: Chapter[]
  onSelect: (foreshadowing: Foreshadowing) => void
}

export function ForeshadowingTimeline({
  foreshadowings,
  chapters,
  onSelect,
}: ForeshadowingTimelineProps) {
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.ordinal - b.ordinal),
    [chapters],
  )

  const chapterIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    sortedChapters.forEach((ch, idx) => map.set(ch.id, idx))
    return map
  }, [sortedChapters])

  if (sortedChapters.length === 0) return null

  const colCount = sortedChapters.length

  return (
    <div className="overflow-x-auto">
      <div
        className="min-w-fit"
        style={{
          display: 'grid',
          gridTemplateColumns: `160px repeat(${colCount}, minmax(60px, 1fr))`,
          gap: '0',
        }}
      >
        {/* Header row */}
        <div className="sticky left-0 z-10 bg-white border-b border-r border-border px-3 py-2 text-xs font-medium text-muted-foreground">
          伏笔
        </div>
        {sortedChapters.map((ch) => (
          <div
            key={ch.id}
            className="border-b border-border px-2 py-2 text-center text-xs font-medium text-muted-foreground truncate"
          >
            第{ch.ordinal}章
          </div>
        ))}

        {/* Foreshadowing rows */}
        {foreshadowings.map((fs) => {
          const plantedIdx = chapterIndexMap.get(fs.chapter_planted_id) ?? 0
          const resolveId = fs.chapter_actual_resolve_id || fs.chapter_expected_resolve_id
          const resolveIdx = resolveId ? (chapterIndexMap.get(resolveId) ?? plantedIdx) : plantedIdx
          const startCol = Math.min(plantedIdx, resolveIdx)
          const endCol = Math.max(plantedIdx, resolveIdx)
          const color = STATUS_COLORS[fs.status] ?? STATUS_COLORS.planted

          return (
            <div key={fs.id} className="contents">
              {/* Label cell */}
              <div
                className="sticky left-0 z-10 bg-white border-b border-r border-border px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => onSelect(fs)}
              >
                <p className="text-sm font-medium text-foreground truncate">{fs.title}</p>
                <span
                  className={cn(
                    'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                    STATUS_BG[fs.status],
                  )}
                  style={{ color }}
                >
                  {STATUS_LABELS[fs.status] ?? fs.status}
                </span>
              </div>

              {/* Timeline cells */}
              {sortedChapters.map((_, colIdx) => {
                const isInRange = colIdx >= startCol && colIdx <= endCol
                const isStart = colIdx === plantedIdx
                const isEnd = colIdx === (resolveId ? (chapterIndexMap.get(resolveId) ?? plantedIdx) : plantedIdx)

                return (
                  <div
                    key={colIdx}
                    className={cn(
                      'relative border-b border-border px-0.5 py-2.5 cursor-pointer',
                      isInRange && 'hover:bg-slate-50',
                    )}
                    onClick={() => onSelect(fs)}
                  >
                    {isInRange && (
                      <div className="absolute inset-y-0 flex items-center w-full px-0.5">
                        <div
                          className="h-2.5 w-full"
                          style={{
                            backgroundColor: color,
                            opacity: 0.25,
                            borderRadius:
                              isStart && isEnd ? '9999px' :
                              isStart ? '9999px 0 0 9999px' :
                              isEnd ? '0 9999px 9999px 0' : '0',
                          }}
                        />
                      </div>
                    )}
                    {(isStart || isEnd) && (
                      <div className="absolute inset-y-0 flex items-center justify-center w-full">
                        <div
                          className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[key] }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
