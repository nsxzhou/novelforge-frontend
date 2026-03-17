import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { listProjects } from '@/shared/api/projects'
import { listChapters } from '@/shared/api/chapters'
import { queryKeys } from '@/shared/api/queries'
import type { Project, Chapter } from '@/shared/api/types'
import { Badge } from '@/shared/ui/badge'
import { LoadingState } from '@/shared/ui/feedback'
import { wordCount, formatRelativeTime } from '@/shared/lib/format'

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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-light tracking-tight text-foreground">{value}</p>
    </div>
  )
}

function ProjectCard({
  project,
  chapterCount,
  totalWords,
}: {
  project: Project
  chapterCount: number
  totalWords: number
}) {
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
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{chapterCount} 章节</span>
          <span>{totalWords} 字</span>
          <span className="ml-auto">{formatRelativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  )
}

function KanbanColumn({
  title,
  projects,
  chaptersMap,
}: {
  title: string
  projects: Project[]
  chaptersMap: Map<string, Chapter[]>
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{projects.length}</span>
      </div>
      <div className="space-y-3">
        {projects.map((project) => {
          const chapters = chaptersMap.get(project.id) ?? []
          const totalWords = chapters.reduce((sum, ch) => sum + wordCount(ch.content), 0)
          return (
            <ProjectCard
              key={project.id}
              project={project}
              chapterCount={chapters.length}
              totalWords={totalWords}
            />
          )
        })}
        <Link to="/new-project">
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[#E2E8F0] p-4 text-sm text-muted-foreground transition-colors duration-150 hover:bg-[#F8FAFC] hover:text-foreground">
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </div>
        </Link>
      </div>
    </div>
  )
}

export function HomePage() {
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => listProjects({ limit: 200, offset: 0 }),
  })

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data])

  // Fetch chapters for all projects
  const projectIds = useMemo(() => projects.map((p) => p.id).join(','), [projects])
  const chaptersQueries = useQuery({
    queryKey: ['all-chapters', projectIds],
    queryFn: async () => {
      const results = await Promise.all(
        projects.map((p) => listChapters(p.id, 200, 0).catch(() => [] as Chapter[])),
      )
      const map = new Map<string, Chapter[]>()
      projects.forEach((p, i) => map.set(p.id, results[i]))
      return map
    },
    enabled: projects.length > 0,
  })

  const chaptersMap = useMemo(() => chaptersQueries.data ?? new Map<string, Chapter[]>(), [chaptersQueries.data])

  const stats = useMemo(() => {
    let totalChapters = 0
    let totalWords = 0
    chaptersMap.forEach((chapters) => {
      totalChapters += chapters.length
      totalWords += chapters.reduce((sum, ch) => sum + wordCount(ch.content), 0)
    })
    return { projectCount: projects.length, totalChapters, totalWords }
  }, [projects.length, chaptersMap])

  const grouped = useMemo(() => {
    const draft: Project[] = []
    const active: Project[] = []
    const archived: Project[] = []
    for (const p of projects) {
      if (p.status === 'draft') draft.push(p)
      else if (p.status === 'active') active.push(p)
      else archived.push(p)
    }
    return { draft, active, archived }
  }, [projects])

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingState text="加载项目中..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-light tracking-tight text-foreground">仪表盘</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理你的所有创作项目</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="项目总数" value={stats.projectCount} />
        <StatCard label="章节总数" value={stats.totalChapters} />
        <StatCard label="总字数" value={stats.totalWords} />
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <KanbanColumn title="草稿" projects={grouped.draft} chaptersMap={chaptersMap} />
        <KanbanColumn title="进行中" projects={grouped.active} chaptersMap={chaptersMap} />
        <KanbanColumn title="已归档" projects={grouped.archived} chaptersMap={chaptersMap} />
      </div>
    </div>
  )
}
