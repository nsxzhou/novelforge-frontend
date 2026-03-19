import { request } from '@/shared/api/http-client'
import { streamRequest, type SSECallbacks } from '@/shared/api/sse-client'
import type { Chapter, GenerationRecord } from '@/shared/api/types'

type ChapterListResponse = { chapters: Chapter[] }
export type ChapterGenerationResponse = { chapter: Chapter; generation_record: GenerationRecord }

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
  streamRequest(`/projects/${projectId}/chapters/stream`, input, callbacks, signal)
}

export function continueChapterStream(
  chapterId: string,
  input: ContinueChapterInput,
  callbacks: SSECallbacks<ChapterGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequest(`/chapters/${chapterId}/continue/stream`, input, callbacks, signal)
}

export function rewriteChapterStream(
  chapterId: string,
  input: RewriteChapterInput,
  callbacks: SSECallbacks<ChapterGenerationResponse>,
  signal?: AbortSignal,
): void {
  streamRequest(`/chapters/${chapterId}/rewrite/stream`, input, callbacks, signal)
}

export type SuggestChapterInput = { content_before_cursor: string }
export type SuggestResponse = { suggestion: string }

export function suggestChapterStream(
  chapterId: string,
  input: SuggestChapterInput,
  callbacks: SSECallbacks<SuggestResponse>,
  signal?: AbortSignal,
): void {
  streamRequest(`/chapters/${chapterId}/suggest/stream`, input, callbacks, signal)
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
