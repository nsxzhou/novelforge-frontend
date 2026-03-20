import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, ChevronLeft, ChevronRight, MapPin, Heart, Users,
} from 'lucide-react'
import { listAllAssets } from '@/shared/api/assets'
import { listAllChapters } from '@/shared/api/chapters'
import { listLatestCharacterStates } from '@/shared/api/character-states'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { queryKeys } from '@/shared/api/queries'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/cn'
import { wordCount } from '@/shared/lib/format'

type WritingSidebarProps = {
  projectId: string
  currentChapterId: string
  onChapterSelect: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function WritingSidebar({
  projectId,
  currentChapterId,
  onChapterSelect,
  isOpen,
  onToggle,
}: WritingSidebarProps) {
  const assetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAllAssets({ projectId }),
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
  })

  const characterStatesQuery = useQuery({
    queryKey: queryKeys.characterStatesLatest(projectId),
    queryFn: () => listLatestCharacterStates(projectId),
  })

  const chapters = useMemo(
    () => [...(chaptersQuery.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [chaptersQuery.data],
  )

  const outlineChapters = useMemo(() => {
    const outlineAsset = (assetsQuery.data ?? []).find((a) => a.type === 'outline')
    if (!outlineAsset) return []
    const data = parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
    return flattenOutlineChapters(data)
  }, [assetsQuery.data])

  const characterStates = characterStatesQuery.data ?? []

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'fixed top-4 z-30 flex h-8 w-8 items-center justify-center rounded-full',
          'border border-border bg-card text-muted-foreground shadow-sm',
          'transition-all duration-200 hover:bg-muted',
          isOpen ? 'right-[321px]' : 'right-4',
        )}
      >
        {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-20 h-full w-[320px] border-l border-border bg-card',
          'overflow-y-auto transition-transform duration-200',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="space-y-6 p-4 pt-14">
          {/* Outline Navigation */}
          {outlineChapters.length > 0 && (
            <section>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                大纲导航
              </h4>
              <div className="space-y-1">
                {outlineChapters.map((planned) => {
                  const written = chapters.find((c) => c.ordinal === planned.ordinal)
                  const isCurrent = written?.id === currentChapterId
                  return (
                    <button
                      key={planned.ordinal}
                      type="button"
                      disabled={!written}
                      onClick={() => written && onChapterSelect(written.id)}
                      className={cn(
                        'w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                        isCurrent
                          ? 'bg-muted font-medium text-foreground'
                          : written
                            ? 'text-foreground hover:bg-muted'
                            : 'cursor-not-allowed text-muted-foreground/50',
                      )}
                    >
                      <span className="text-xs text-muted-foreground">第{planned.ordinal}章</span>
                      {' '}
                      {planned.title || '未命名'}
                      {!written && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground">(未写)</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* Character Cards */}
          {characterStates.length > 0 && (
            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <Users className="h-3 w-3" />
                角色状态
              </h4>
              <div className="space-y-2">
                {characterStates.map((cs) => (
                  <div
                    key={cs.id}
                    className="rounded-lg border border-border bg-white p-2.5 text-sm"
                  >
                    <p className="font-medium text-foreground">{cs.character_name}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {cs.location && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {cs.location}
                        </p>
                      )}
                      {cs.emotional_state && (
                        <p className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {cs.emotional_state}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Chapter List */}
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              章节列表
            </h4>
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
                      'w-full rounded-md px-2.5 py-2 text-left transition-colors',
                      isCurrent
                        ? 'bg-muted border-l-2 border-l-foreground'
                        : 'hover:bg-muted',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        第{chapter.ordinal}章 · {chapter.title}
                      </span>
                      <Badge
                        variant={isConfirmed ? 'success' : 'warning'}
                        className="shrink-0 text-[10px]"
                      >
                        {isConfirmed ? '已确认' : '草稿'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {wordCount(chapter.content)} 字
                    </p>
                  </button>
                )
              })}
              {chapters.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">暂无章节</p>
              )}
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
