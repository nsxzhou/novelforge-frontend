import { request } from '@/shared/api/http-client'
import { streamRequestWithSchema, type SSECallbacks } from '@/shared/api/sse-client'
import type { Chapter, GenerationRecord, ReviewResult } from '@/shared/api/types'
import { chapterGenerationResponseSchema, suggestResponseSchema } from '@/shared/api/runtime-schemas'

type ChapterListResponse = { chapters: Chapter[] }
export type ChapterGenerationResponse = { chapter: Chapter; generation_record: GenerationRecord }

export type CreateChapterInput = {
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

export async function listAllChapters(projectId: string, pageSize = 100): Promise<Chapter[]> {
  const chapters: Chapter[] = []
  let offset = 0

  while (true) {
    const page = await listChapters(projectId, pageSize, offset)
    chapters.push(...page)

    if (page.length < pageSize) {
      break
    }

    offset += pageSize
  }

  return chapters
}

export function getChapter(chapterId: string): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}`)
}

export function confirmChapter(chapterId: string): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}/confirm`, {
    method: 'POST',
  })
}

export function unconfirmChapter(chapterId: string): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}/unconfirm`, {
    method: 'POST',
  })
}

export function createChapterStream(
  projectId: string,
  input: CreateChapterInput,
  callbacks: SSECallbacks<ChapterGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequestWithSchema(
    `/projects/${projectId}/chapters/stream`,
    input,
    callbacks,
    chapterGenerationResponseSchema,
    'chapter generation result',
    signal,
  )
}

export function continueChapterStream(
  chapterId: string,
  input: ContinueChapterInput,
  callbacks: SSECallbacks<ChapterGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequestWithSchema(
    `/chapters/${chapterId}/continue/stream`,
    input,
    callbacks,
    chapterGenerationResponseSchema,
    'chapter continuation result',
    signal,
  )
}

export function rewriteChapterStream(
  chapterId: string,
  input: RewriteChapterInput,
  callbacks: SSECallbacks<ChapterGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequestWithSchema(
    `/chapters/${chapterId}/rewrite/stream`,
    input,
    callbacks,
    chapterGenerationResponseSchema,
    'chapter rewrite result',
    signal,
  )
}

export type SuggestChapterInput = { content_before_cursor: string }
export type SuggestResponse = { suggestion: string }

export function suggestChapterStream(
  chapterId: string,
  input: SuggestChapterInput,
  callbacks: SSECallbacks<SuggestResponse>,
  signal?: AbortSignal,
): void {
  streamRequestWithSchema(
    `/chapters/${chapterId}/suggest/stream`,
    input,
    callbacks,
    suggestResponseSchema,
    'chapter suggestion result',
    signal,
  )
}

export type UpdateChapterInput = {
  title?: string
  content?: string
}

export function updateChapter(
  chapterId: string,
  input: UpdateChapterInput,
): Promise<Chapter> {
  return request<Chapter>(`/chapters/${chapterId}`, {
    method: 'PUT',
    body: input,
  })
}

export function reviewChapter(chapterId: string): Promise<ReviewResult> {
  return request<ReviewResult>(`/chapters/${chapterId}/review`, {
    method: 'POST',
  })
}
