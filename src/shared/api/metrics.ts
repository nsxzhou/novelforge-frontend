import { request } from '@/shared/api/http-client'
import type { DashboardSummary } from '@/shared/api/types'

export function getDashboard(projectId?: string, days = 30): Promise<DashboardSummary> {
  const base = projectId
    ? `/projects/${projectId}/metrics/dashboard`
    : '/metrics/dashboard'
  return request<DashboardSummary>(`${base}?days=${days}`)
}
