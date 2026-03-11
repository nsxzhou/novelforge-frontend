import { request } from '@/shared/api/http-client'
import type { Chapter, GenerationRecord } from '@/shared/api/types'

type ChapterListResponse = { chapters: Chapter[] }
type ChapterGenerationResponse = { chapter: Chapter; generation_record: GenerationRecord }

export type CreateChapterInput = {
  title: string
  ordinal: number
  instruction: string
}

export type ContinueChapterInput = { instruction: string }

export type RewriteChapterInput = {
  target_text: string
  instruction: string
}

export function listChapters(projectId: string, limit = 20, offset = 0): Promise<Chapter[]> {
  return request<ChapterListResponse>(
    `/projects/${projectId}/chapters?limit=${limit}&offset=${offset}`,
  ).then((r) => r.chapters)
}

export function getChapter(chapterId: string): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}`)
}

export function createChapter(
  projectId: string,
  input: CreateChapterInput,
): Promise<ChapterGenerationResponse> {
  return request<ChapterGenerationResponse>(`/projects/${projectId}/chapters`, {
    method: 'POST',
    body: input,
  })
}

export function continueChapter(
  chapterId: string,
  input: ContinueChapterInput,
): Promise<ChapterGenerationResponse> {
  return request<ChapterGenerationResponse>(`/chapters/${chapterId}/continue`, {
    method: 'POST',
    body: input,
  })
}

export function rewriteChapter(
  chapterId: string,
  input: RewriteChapterInput,
): Promise<ChapterGenerationResponse> {
  return request<ChapterGenerationResponse>(`/chapters/${chapterId}/rewrite`, {
    method: 'POST',
    body: input,
  })
}

export function confirmChapter(chapterId: string, userId: string): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}/confirm`, {
    method: 'POST',
    headers: {
      'X-User-ID': userId,
    },
  })
}
