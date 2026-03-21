import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, BookOpen, Maximize2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { listAllAssets } from '@/shared/api/assets'
import { listAllChapters } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import { Button } from '@/shared/ui/button'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Badge } from '@/shared/ui/badge'
import { EmptyState } from '@/shared/ui/empty-state'
import { getErrorMessage } from '@/shared/lib/error-message'
import { variants } from '@/shared/lib/motion'
import { cn } from '@/shared/lib/cn'
import { wordCount } from '@/shared/lib/format'
import { detectContentFormat, parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { groupChaptersByVolume } from './lib/group-chapters-by-volume'
import { CreateChapterDialog, type CreateChapterFormValue } from './components/create-chapter-dialog'

type ChaptersPanelProps = {
  projectId: string
}

export function ChaptersPanel({ projectId }: ChaptersPanelProps) {
  const navigate = useNavigate()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

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

  const outlineAsset = useMemo(
    () => (assetsQuery.data ?? []).find((asset) => asset.type === 'outline') ?? null,
    [assetsQuery.data],
  )

  const outlineIsStructured = useMemo(() => {
    if (!outlineAsset) return false
    return outlineAsset.content_schema === 'outline_v2'
      || detectContentFormat(outlineAsset.content, 'outline') === 'structured'
  }, [outlineAsset])

  const outlineData = useMemo(() => {
    if (!outlineAsset || !outlineIsStructured) return null
    return parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null
  }, [outlineAsset, outlineIsStructured])

  const outlineAssetExists = outlineAsset !== null
  const plannedChapters = useMemo(
    () => flattenOutlineChapters(outlineData),
    [outlineData],
  )
  const hasVolumeOnlyOutline = outlineData !== null && plannedChapters.length === 0
  const hasInvalidOutlineStructure = outlineAssetExists && outlineIsStructured && outlineData === null
  const unwrittenPlannedChapters = useMemo(
    () => plannedChapters.filter((planned) => !chapters.some((chapter) => chapter.ordinal === planned.ordinal)),
    [plannedChapters, chapters],
  )

  function handleCreateSubmit(value: CreateChapterFormValue) {
    setShowCreateDialog(false)
    navigate('/write/new', {
      state: { projectId, ...value },
    })
  }

  const volumeGroups = useMemo(
    () => groupChaptersByVolume(outlineData, chapters),
    [outlineData, chapters],
  )
  const [collapsedVolumes, setCollapsedVolumes] = useState<Set<number>>(new Set())

  function toggleVolume(volumeIndex: number) {
    setCollapsedVolumes((prev) => {
      const next = new Set(prev)
      if (next.has(volumeIndex)) next.delete(volumeIndex)
      else next.add(volumeIndex)
      return next
    })
  }

  function renderChapterButton(chapter: typeof chapters[number]) {
    const isConfirmed = chapter.status === 'confirmed'
    return (
      <motion.button
        key={chapter.id}
        variants={variants.fadeInUp}
        type="button"
        onClick={() => navigate(`/write/${chapter.id}`)}
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
          'hover:bg-muted border border-transparent hover:border-border',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium tracking-tight truncate">
            第{chapter.ordinal}章 · {chapter.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {chapter.pov_character && (
              <Badge variant="default" className="text-[10px]">
                {chapter.pov_character} 视角
              </Badge>
            )}
            <Badge variant={isConfirmed ? 'success' : 'warning'} className="text-[10px]">
              {isConfirmed ? '已确认' : '草稿'}
            </Badge>
            <Maximize2 className="h-3 w-3 text-muted-foreground ml-1" />
          </div>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {wordCount(chapter.content)} 字
        </p>
      </motion.button>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">章节列表</h3>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          disabled={unwrittenPlannedChapters.length === 0}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          新章节
        </Button>
      </div>

      {/* Loading / error */}
      {chaptersQuery.isLoading && <LoadingState text="加载章节中..." />}
      {chaptersQuery.error && <ErrorState text={getErrorMessage(chaptersQuery.error)} />}

      {/* Chapter list */}
      {chapters.length === 0 && !chaptersQuery.isLoading && (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="暂无章节"
          description={
            unwrittenPlannedChapters.length > 0
              ? '从大纲计划中选择章节开始创作'
              : hasVolumeOnlyOutline
                ? '当前仅完成分卷规划，请先补章节计划。'
                : hasInvalidOutlineStructure
                  ? '当前大纲结构无效，请先修复后再规划章节。'
                  : '请先创建大纲并规划章节'
          }
          className="py-8"
        />
      )}

      {/* Tree mode: grouped by volume */}
      {volumeGroups && chapters.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={variants.staggerChildren} className="space-y-2">
          {volumeGroups.map((group) => {
            const isCollapsed = collapsedVolumes.has(group.volumeIndex)
            const groupChapters = chapters.filter((c) =>
              group.chapters.some((gc) => gc.written?.id === c.id),
            )
            return (
              <div key={group.volumeIndex}>
                <button
                  type="button"
                  onClick={() => toggleVolume(group.volumeIndex)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  {isCollapsed
                    ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground truncate">
                    {group.volumeTitle}
                  </span>
                  <Badge variant="default" className="ml-auto shrink-0 text-[10px]">
                    {group.writtenCount}/{group.totalCount}
                  </Badge>
                </button>
                {!isCollapsed && (
                  <div className="ml-4 border-l border-border pl-2 space-y-1.5">
                    {groupChapters.map(renderChapterButton)}
                    {groupChapters.length === 0 && (
                      <p className="py-2 pl-3 text-xs text-muted-foreground">本卷暂无已写章节</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* Flat mode: no volume grouping */}
      {!volumeGroups && chapters.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={variants.staggerChildren} className="space-y-1.5">
          {chapters.map(renderChapterButton)}
        </motion.div>
      )}

      {/* Create chapter dialog */}
      <CreateChapterDialog
        projectId={projectId}
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={false}
      />
    </div>
  )
}
