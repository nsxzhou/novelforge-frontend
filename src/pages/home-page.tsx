import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { listProjects } from '@/shared/api/projects'
import { getStats } from '@/shared/api/stats'
import { queryKeys } from '@/shared/api/queries'
import type { ProjectListItem } from '@/shared/api/types'
import { Badge } from '@/shared/ui/badge'
import { LoadingState } from '@/shared/ui/feedback'
import { formatRelativeTime } from '@/shared/lib/format'
import { cn } from '@/shared/lib/cn'
import {
  useCostDashboardData,
  CostMetricCards,
  CostTokenTrend,
  CostDistribution,
} from '@/features/metrics/cost-dashboard'

const statusLabel: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  archived: '已归档',
}

const statusBadgeVariant: Record<string, 'default' | 'success'> = {
  draft: 'default',
  active: 'success',
  archived: 'default',
}

function StatCard({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-[#E2E8F0] bg-white p-6', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-light tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function ProjectCard({ project, plannedCount }: { project: ProjectListItem; plannedCount?: number }) {
  const progress = plannedCount && plannedCount > 0
    ? Math.round((project.chapter_count / plannedCount) * 100)
    : null

  return (
    <Link to={`/projects/${project.id}`}>
      <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 transition-colors duration-150 hover:bg-[#F8FAFC]">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground truncate">{project.title}</h3>
          <Badge variant={statusBadgeVariant[project.status] ?? 'default'}>
            {statusLabel[project.status] ?? project.status}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{project.summary}</p>
        {progress !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>章节进度</span>
              <span>{project.chapter_count}/{plannedCount}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{project.chapter_count} 章节</span>
          <span>{project.word_count} 字</span>
          <span className="ml-auto">{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}

export function HomePage() {
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => listProjects({ limit: 200, offset: 0 }),
  })

  const statsQuery = useQuery({
    queryKey: queryKeys.stats,
    queryFn: getStats,
  })

  const dashboardQuery = useCostDashboardData()

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])

  const stats = useMemo(() => {
    if (statsQuery.data) {
      return {
        projectCount: statsQuery.data.project_count,
        totalChapters: statsQuery.data.chapter_count,
        totalWords: statsQuery.data.total_word_count,
      }
    }
    return { projectCount: projects.length, totalChapters: 0, totalWords: 0 }
  }, [statsQuery.data, projects.length])

  const dashboardData = dashboardQuery.data
  const hasUsageData = dashboardData && dashboardData.total_generations > 0

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingState text="加载项目中..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-foreground">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理你的所有创作项目</p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        {/* Row 1: 3 StatCards */}
        <StatCard label="项目总数" value={stats.projectCount} className="sm:col-span-4" />
        <StatCard label="章节总数" value={stats.totalChapters} className="sm:col-span-4" />
        <StatCard label="总字数" value={stats.totalWords} className="sm:col-span-4" />

        {/* Row 2: Cost metric cards (full width) */}
        {hasUsageData && (
          <div className="sm:col-span-12">
            <CostMetricCards data={dashboardData} />
          </div>
        )}

        {/* Row 3: Token trend (7col) + Distribution (5col) */}
        {hasUsageData && (
          <>
            <div className="sm:col-span-7">
              <CostTokenTrend data={dashboardData} />
            </div>
            <div className="sm:col-span-5">
              <CostDistribution data={dashboardData} />
            </div>
          </>
        )}

        {/* Row 4: All projects grid */}
        <div className="sm:col-span-12">
          <h2 className="mb-4 text-sm font-medium text-foreground">
            所有项目
            <span className="ml-2 text-muted-foreground">{projects.length}</span>
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
            <Link to="/new-project">
              <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] p-4 text-sm text-muted-foreground transition-colors duration-150 hover:bg-[#F8FAFC] hover:text-foreground">
                <Plus className="mr-2 h-4 w-4" />
                新建项目
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
