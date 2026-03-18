export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  assets: (projectId: string, type: string) => ['assets', projectId, type] as const,
  chapters: (projectId: string) => ['chapters', projectId] as const,
  chapter: (chapterId: string) => ['chapter', chapterId] as const,
  characterStatesLatest: (projectId: string) => ['characterStates', projectId, 'latest'] as const,
  characterStatesChapter: (projectId: string, chapterId: string) =>
    ['characterStates', projectId, 'chapter', chapterId] as const,
  timeline: (projectId: string) => ['timeline', projectId] as const,
  llmProviders: ['llmProviders'] as const,
  prompts: (projectId: string) => ['prompts', projectId] as const,
}
