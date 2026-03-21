import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import { listAllChapters } from '@/shared/api/chapters'
import { listAllAssets } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import type { OutlineData } from '@/features/assets/schemas/outline-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { cn } from '@/shared/lib/cn'
import { wordCount } from '@/shared/lib/format'
import { getErrorMessage } from '@/shared/lib/error-message'
import { groupChaptersByVolume } from '../lib/group-chapters-by-volume'

type ChapterTreeProps = {
  projectId: string
  currentChapterId?: string | null
  onChapterSelect: (id: string) => void
  compact?: boolean
}

export function ChapterTree({
  projectId,
  currentChapterId,
  onChapterSelect,
  compact = false,
}: ChapterTreeProps) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
  })

  const assetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAllAssets({ projectId }),
  })

  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
  )

  const outlineData = useMemo(() => {
    const outlineAsset = (assetsQuery.data ?? []).find((a) => a.type === 'outline')
    if (!outlineAsset) return null
    return parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
  }, [assetsQuery.data])

  const volumeGroups = useMemo(
    () => groupChaptersByVolume(outlineData, chapters),
    [outlineData, chapters],
  )

  function toggleCollapse(volumeIndex: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(volumeIndex)) next.delete(volumeIndex)
      else next.add(volumeIndex)
      return next
    })
  }

  if (chaptersQuery.isLoading) return <LoadingState text="加载中..." />
  if (chaptersQuery.error) return <ErrorState text={getErrorMessage(chaptersQuery.error)} />

  if (chapters.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="暂无章节"
        description="创建第一个章节开始写作"
        className="py-6"
      />
    )
  }

  // Tree mode: grouped by volume
  if (volumeGroups) {
    return (
      <div className="space-y-1">
        {volumeGroups.map((group) => {
          const isCollapsed = collapsed.has(group.volumeIndex)
          return (
            <div key={group.volumeIndex}>
              {/* Volume header */}
              <button
                type="button"
                onClick={() => toggleCollapse(group.volumeIndex)}
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md px-2 text-left transition-colors hover:bg-muted',
                  compact ? 'py-1' : 'py-1.5',
                )}
              >
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                <span className={cn('truncate font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
                  {group.volumeTitle}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  {group.writtenCount}/{group.totalCount}
                </span>
              </button>

              {/* Chapter items */}
              {!isCollapsed && (
                <div className="ml-3 border-l border-border pl-2">
                  {group.chapters.map((ch) => {
                    const isCurrent = ch.written?.id === currentChapterId
                    const isWritten = ch.written !== null
                    return (
                      <button
                        key={ch.ordinal}
                        type="button"
                        disabled={!isWritten}
                        onClick={() => isWritten && onChapterSelect(ch.written!.id)}
                        className={cn(
                          'w-full rounded-md px-2 text-left transition-colors',
                          compact ? 'py-1 text-xs' : 'py-1.5 text-sm',
                          isCurrent
                            ? 'bg-muted/60 font-medium text-foreground'
                            : isWritten
                              ? 'hover:bg-muted/40'
                              : 'text-muted-foreground/50 cursor-not-allowed',
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate">
                            第{ch.ordinal}章 · {ch.plannedTitle}
                          </span>
                          {isWritten && ch.written && (
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {wordCount(ch.written.content)}字
                            </span>
                          )}
                          {!isWritten && (
                            <span className="shrink-0 text-[10px] text-muted-foreground/50">未写</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Flat mode: no outline or no volumes
  return (
    <div className="space-y-1">
      {chapters.map((chapter) => {
        const isCurrent = chapter.id === currentChapterId
        const isConfirmed = chapter.status === 'confirmed'
        return (
          <button
            key={chapter.id}
            type="button"
            onClick={() => onChapterSelect(chapter.id)}
            className={cn(
              'w-full rounded-md px-2.5 text-left transition-colors',
              compact ? 'py-1.5' : 'py-2',
              isCurrent
                ? 'bg-muted/60 font-medium'
                : 'hover:bg-muted/40',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">
                第{chapter.ordinal}章 · {chapter.title}
              </span>
              <span className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                isConfirmed ? 'bg-emerald-400' : 'bg-amber-300',
              )} />
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {wordCount(chapter.content)} 字
            </p>
          </button>
        )
      })}
    </div>
  )
}
