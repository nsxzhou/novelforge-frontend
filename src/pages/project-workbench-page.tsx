import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { getProject } from '@/shared/api/projects'
import { listAssets } from '@/shared/api/assets'
import { queryKeys } from '@/shared/api/queries'
import { AppShell } from '@/shared/ui/layout'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { Button } from '@/shared/ui/button'
import { AssetsPanel } from '@/features/assets/assets-panel'
import { ConversationsPanel } from '@/features/conversations/conversations-panel'
import { ChaptersPanel } from '@/features/chapters/chapters-panel'

type TabKey = 'overview' | 'assets' | 'conversations' | 'chapters'

const tabLabels: Record<TabKey, string> = {
  overview: '项目概览',
  assets: '设定工坊',
  conversations: '对话微调',
  chapters: '章节生成器',
}

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
  const navigate = useNavigate()
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
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-lg bg-white p-6">
              <h2 className="text-2xl font-extrabold tracking-tight">{project.title}</h2>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-blue-700">
                状态：{getProjectStatusLabel(project.status)}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-700">{project.summary}</p>
            </article>

            <article className="rounded-lg bg-green-50 p-6">
              <h3 className="text-xl font-extrabold tracking-tight">V1 当前进度</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>资产数量：{assets.length}</li>
                <li>支持资产类型：世界观 / 角色 / 大纲</li>
                <li>可用操作：对话微调、章节生成、当前稿确认</li>
                <li>后端 API：/api/v1 已完整接入</li>
              </ul>
            </article>
          </section>
        )
      case 'assets':
        return <AssetsPanel projectId={project.id} />
      case 'conversations':
        return <ConversationsPanel project={project} assets={assets} />
      case 'chapters':
        return <ChaptersPanel projectId={project.id} />
      default:
        return null
    }
  }, [activeTab, assetsQuery.data, projectQuery.data])

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-lg bg-white p-6 md:p-8">
          {/* 使用几何装饰增强 Flat Design 的版面层次，同时保持中等视觉强度。 */}
          <div className="flat-deco-dot -right-10 -top-10 h-24 w-24 bg-blue-100/60" />
          <div className="flat-deco-square bottom-2 right-16 h-10 w-10 bg-emerald-100/70" />

          <div className="relative space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" size="sm" onClick={() => navigate('/projects')}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                返回项目列表
              </Button>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Project Workbench</p>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {projectQuery.data?.title ?? '项目工作台'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                统一管理设定资产、对话微调与章节生成流程，保持创作上下文连续。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  className={`rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-200 ${
                    activeTab === tab
                      ? 'bg-primary text-white'
                      : 'bg-muted text-gray-700 hover:scale-105 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tabLabels[tab]}
                </button>
              ))}
            </div>
          </div>
        </section>
        <div className="space-y-4">
          {projectQuery.isLoading ? <LoadingState text="加载项目中..." /> : null}
          {projectQuery.error ? <ErrorState text={String((projectQuery.error as Error).message)} /> : null}
          {projectQuery.data ? content : null}
        </div>
      </div>
    </AppShell>
  )
}
