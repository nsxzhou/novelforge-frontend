import type { Chapter } from '@/shared/api/types'
import type { OutlineData } from '@/features/assets/schemas/outline-schema'

export type VolumeGroup = {
  volumeIndex: number
  volumeTitle: string
  chapters: Array<{
    ordinal: number
    plannedTitle: string
    written: Chapter | null
  }>
  writtenCount: number
  totalCount: number
}

export function groupChaptersByVolume(
  outlineData: OutlineData | null,
  chapters: Chapter[],
): VolumeGroup[] | null {
  if (!outlineData?.volumes?.length) return null

  const hasPlannedChapters = outlineData.volumes.some(
    (v) => (v.chapters?.length ?? 0) > 0,
  )
  if (!hasPlannedChapters) return null

  return outlineData.volumes.map((volume, volumeIndex) => {
    const volumeChapters = (volume.chapters ?? []).map((planned) => ({
      ordinal: planned.ordinal,
      plannedTitle: planned.title || `第${planned.ordinal}章`,
      written: chapters.find((c) => c.ordinal === planned.ordinal) ?? null,
    }))

    return {
      volumeIndex,
      volumeTitle: volume.title || `分卷 ${volumeIndex + 1}`,
      chapters: volumeChapters,
      writtenCount: volumeChapters.filter((c) => c.written !== null).length,
      totalCount: volumeChapters.length,
    }
  })
}
