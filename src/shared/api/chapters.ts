import { request } from '@/shared/api/http-client'
import { streamRequest, type SSECallbacks } from '@/shared/api/sse-client'
import type { Chapter, GenerationRecord } from '@/shared/api/types'

const ANONYMOUS_USER_ID = '00000000-0000-0000-0000-000000000000'

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
    headers: {
      'X-User-ID': ANONYMOUS_USER_ID,
    },
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
