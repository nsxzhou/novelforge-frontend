import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getProject } from '@/shared/api/projects'
import { listAssets } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { Tabs } from '@/shared/ui/tabs'
import { AssetsPanel } from '@/features/assets/assets-panel'
import { ConversationsPanel } from '@/features/conversations/conversations-panel'
import { ChaptersPanel } from '@/features/chapters/chapters-panel'
import { PromptsPanel } from '@/features/prompts/prompts-panel'

type TabKey = 'overview' | 'assets' | 'conversations' | 'chapters' | 'prompts'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '项目概览' },
  { key: 'assets', label: '设定工坊' },
  { key: 'conversations', label: '对话微调' },
  { key: 'chapters', label: '章节生成器' },
  { key: 'prompts', label: 'Prompt 模板' },
]

function getProjectStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'active':
      return '进行中'
    case 'archived':
      return '已归档'
    default:
      return status
  }
}

export function ProjectWorkbenchPage() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })

  const assetsQuery = useQuery({
    queryKey: queryKeys.assets(projectId, 'all'),
    queryFn: () => listAssets({ projectId, limit: 200, offset: 0 }),
    enabled: Boolean(projectId),
  })

  const content = useMemo(() => {
    if (!projectQuery.data) {
      return null
    }

    const project = projectQuery.data
    const assets = assetsQuery.data ?? []

    switch (activeTab) {
      case 'overview':
        return (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl tracking-tight">{project.title}</h2>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {getProjectStatusLabel(project.status)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{project.summary}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-md">
              <h3 className="font-display text-xl tracking-tight">项目统计</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  资产数量：{assets.length}
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-secondary" />
                  支持资产类型：世界观 / 角色 / 大纲
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  可用操作：对话微调、章节生成、Prompt 模板覆盖
                </li>
              </ul>
            </div>
          </section>
        )
      case 'assets':
        return <AssetsPanel projectId={project.id} />
      case 'conversations':
        return <ConversationsPanel project={project} assets={assets} />
      case 'chapters':
        return <ChaptersPanel projectId={project.id} />
      case 'prompts':
        return <PromptsPanel projectId={project.id} />
      default:
        return null
    }
  }, [activeTab, assetsQuery.data, projectQuery.data])

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight text-foreground">
              {projectQuery.data?.title ?? '项目工作台'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              统一管理设定资产、对话微调与章节生成流程，保持创作上下文连续。
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
            <span className="font-mono text-xs uppercase tracking-[0.15em] text-accent">
              Workbench
            </span>
          </div>
        </div>

        <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      <div className="space-y-6">
        {projectQuery.isLoading ? <LoadingState text="加载项目中..." /> : null}
        {projectQuery.error ? <ErrorState text={String((projectQuery.error as Error).message)} /> : null}
        {projectQuery.data ? content : null}
      </div>
    </div>
  )
}
