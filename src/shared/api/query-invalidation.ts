import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { queryKeys } from '@/shared/api/queries'

export async function invalidateProjectAssets(
  queryClient: QueryClient,
  projectId: string,
  extraQueryKeys: QueryKey[] = [],
): Promise<void> {
  const targets: QueryKey[] = [
    queryKeys.assetsAll(projectId, 'all'),
    queryKeys.assetsAll(projectId, 'character'),
    ...extraQueryKeys,
  ]

  await Promise.all(targets.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export async function invalidateProjectChapters(
  queryClient: QueryClient,
  projectId: string,
  chapterId?: string | null,
): Promise<void> {
  const targets: QueryKey[] = [queryKeys.chaptersAll(projectId)]
  if (chapterId) {
    targets.push(queryKeys.chapter(chapterId))
  }

  await Promise.all(targets.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export async function invalidateProjectOverview(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
  ])
}

export async function invalidateProjectPrompts(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.prompts(projectId) })
}

export async function invalidateProviders(
  queryClient: QueryClient,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.llmProviders }),
    queryClient.invalidateQueries({ queryKey: queryKeys.llmTimeoutPolicy }),
  ])
}

export async function invalidateCharacterStates(
  queryClient: QueryClient,
  projectId: string,
  chapterScopeId?: string,
  targetChapterId?: string,
): Promise<void> {
  const targets: QueryKey[] = [queryKeys.characterStatesLatest(projectId)]

  if (chapterScopeId) {
    targets.push(queryKeys.characterStatesChapter(projectId, chapterScopeId))
  }

  if (targetChapterId && targetChapterId !== chapterScopeId) {
    targets.push(queryKeys.characterStatesChapter(projectId, targetChapterId))
  }

  await Promise.all(targets.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
}

export async function invalidateProjectTimeline(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.timeline(projectId) })
}

export async function invalidateKnowledgeGraph(
  queryClient: QueryClient,
  projectId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.kgNodes(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.kgEdges(projectId) }),
  ])
}
