import { request } from '@/shared/api/http-client'
import type { ProjectStats } from '@/shared/api/types'

export type Stats = {
  project_count: number
  chapter_count: number
  total_word_count: number
  projects: ProjectStats[]
}

export function getStats(): Promise<Stats> {
  return request<Stats>('/stats')
}
