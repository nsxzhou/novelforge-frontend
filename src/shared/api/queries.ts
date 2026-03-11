export const queryKeys = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  assets: (projectId: string, type: string) => ['assets', projectId, type] as const,
  conversations: (projectId: string, targetType: string, targetId: string) =>
    ['conversations', projectId, targetType, targetId] as const,
  conversation: (conversationId: string) => ['conversation', conversationId] as const,
  chapters: (projectId: string) => ['chapters', projectId] as const,
  chapter: (chapterId: string) => ['chapter', chapterId] as const,
}
