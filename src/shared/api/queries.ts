export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  assets: (projectId: string, type: string) => ['assets', projectId, type] as const,
  chapters: (projectId: string) => ['chapters', projectId] as const,
  chapter: (chapterId: string) => ['chapter', chapterId] as const,
  llmProviders: ['llmProviders'] as const,
  prompts: (projectId: string) => ['prompts', projectId] as const,
}
