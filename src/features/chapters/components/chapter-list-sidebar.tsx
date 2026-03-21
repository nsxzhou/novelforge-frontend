import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { listAllAssets } from '@/shared/api/assets'
import { listAllChapters } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { cn } from '@/shared/lib/cn'
import { ChapterTree } from './chapter-tree'

type ChapterListSidebarProps = {
  projectId: string
  currentChapterId?: string | null
  onChapterSelect: (id: string) => void
  onCreateChapter: () => void
  isOpen: boolean
  onToggle: () => void
}

export function ChapterListSidebar({
  projectId,
  currentChapterId,
  onChapterSelect,
  onCreateChapter,
  isOpen,
  onToggle,
}: ChapterListSidebarProps) {
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

  const unwrittenCount = useMemo(() => {
    const outlineAsset = (assetsQuery.data ?? []).find((a) => a.type === 'outline')
    if (!outlineAsset) return 0
    const data = parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
    const planned = flattenOutlineChapters(data)
    return planned.filter((p) => !chapters.some((c) => c.ordinal === p.ordinal)).length
  }, [assetsQuery.data, chapters])

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'fixed top-16 z-30 flex h-8 w-8 items-center justify-center rounded-full',
          'bg-card/80 text-muted-foreground backdrop-blur-sm',
          'transition-all duration-200 hover:bg-card',
          isOpen ? 'left-[261px]' : 'left-2',
        )}
      >
        {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed left-0 top-12 z-20 h-[calc(100%-48px)] w-[260px] bg-card shadow-[1px_0_0_0_theme(colors.border/40)]',
          'overflow-y-auto transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="space-y-2 px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground/70">章节</span>
            <button
              type="button"
              onClick={onCreateChapter}
              disabled={unwrittenCount === 0}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <ChapterTree
            projectId={projectId}
            currentChapterId={currentChapterId}
            onChapterSelect={onChapterSelect}
            compact
          />
        </div>
      </aside>
    </>
  )
}
