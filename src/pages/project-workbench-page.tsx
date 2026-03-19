import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download, PencilLine, Trash2, X, Check,
  LayoutGrid, Boxes, BookOpen, Wrench, GitBranch,
  FileText, Calendar, ChevronRight,
} from 'lucide-react'
import { getProject, updateProject, deleteProject } from '@/shared/api/projects'
import { listAllAssets } from '@/shared/api/assets'
import { listAllChapters } from '@/shared/api/chapters'
import { parseStructuredContent } from '@/features/assets/schemas/asset-content'
import { flattenOutlineChapters, type OutlineData } from '@/features/assets/schemas/outline-schema'
import { exportProject } from '@/shared/api/export'
import { queryKeys } from '@/shared/api/queries'
import { invalidateProjectOverview } from '@/shared/api/query-invalidation'
import { LoadingState, ErrorState } from '@/shared/ui/feedback'
import { Tabs } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import { Input, Textarea, Select, FormField } from '@/shared/ui/input'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Dialog, DialogFooter } from '@/shared/ui/dialog'
import { Dropdown, DropdownItem } from '@/shared/ui/dropdown'
import { useToast } from '@/shared/ui/toast'
import { cn } from '@/shared/lib/cn'
import { AssetsPanel } from '@/features/assets/assets-panel'
import { ChaptersPanel } from '@/features/chapters/chapters-panel'
import { MemoryPanel } from '@/features/memory/memory-panel'
import { PromptsPanel } from '@/features/prompts/prompts-panel'
import { getErrorMessage } from '@/shared/lib/error-message'
import { getProjectStatusLabel, formatDate } from '@/shared/lib/format'

type TabKey = 'overview' | 'assets' | 'chapters' | 'memory' | 'prompts'

function getProjectStatusVariant(status: string) {
  switch (status) {
    case 'active': return 'success' as const
    case 'draft': return 'warning' as const
    case 'archived': return 'default' as const
    default: return 'default' as const
  }
}

export function ProjectWorkbenchPage() {
  const { projectId = '' } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editStatus, setEditStatus] = useState('draft')

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  })

  const assetsQuery = useQuery({
    queryKey: queryKeys.assetsAll(projectId, 'all'),
    queryFn: () => listAllAssets({ projectId }),
    enabled: Boolean(projectId),
  })

  const chaptersQuery = useQuery({
    queryKey: queryKeys.chaptersAll(projectId),
    queryFn: () => listAllChapters(projectId),
    enabled: Boolean(projectId),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { title: string; summary: string; status: string }) =>
      updateProject(projectId, {
        title: input.title,
        summary: input.summary,
        status: input.status as 'draft' | 'active' | 'archived',
      }),
    onSuccess: async () => {
      setIsEditing(false)
      await invalidateProjectOverview(queryClient, projectId)
      toast('项目已更新')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      toast('项目已删除')
      navigate('/')
    },
  })

  function startEditing() {
    if (!projectQuery.data) return
    setEditTitle(projectQuery.data.title)
    setEditSummary(projectQuery.data.summary)
    setEditStatus(projectQuery.data.status)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
  }

  function saveEditing() {
    if (!editTitle.trim() || !editSummary.trim()) return
    updateMutation.mutate({
      title: editTitle.trim(),
      summary: editSummary.trim(),
      status: editStatus,
    })
  }

  async function handleExport(format: 'md' | 'txt') {
    if (!projectId) return
    setExportLoading(true)
    try {
      await exportProject(projectId, format)
      toast(`已导出为 ${format.toUpperCase()} 格式`)
    } catch (err) {
      toast(err instanceof Error ? err.message : '导出失败', 'error')
    } finally {
      setExportLoading(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'overview', label: '概览', icon: <LayoutGrid className="h-4 w-4" /> },
    { key: 'assets', label: '设定工坊', icon: <Boxes className="h-4 w-4" />, count: assetsQuery.data?.length },
    { key: 'chapters', label: '章节', icon: <BookOpen className="h-4 w-4" />, count: chaptersQuery.data?.length },
    { key: 'memory', label: '记忆层', icon: <GitBranch className="h-4 w-4" /> },
    { key: 'prompts', label: 'Prompts', icon: <Wrench className="h-4 w-4" /> },
  ]

  function openChapterWorkbench(chapterId: string) {
    setSelectedChapterId(chapterId)
    setActiveTab('chapters')
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'overview' || tab === 'assets' || tab === 'chapters' || tab === 'memory' || tab === 'prompts') {
      setActiveTab(tab)
    }
  }, [searchParams])

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab)
    const next = new URLSearchParams(searchParams)
    if (tab === 'overview') {
      next.delete('tab')
    } else {
      next.set('tab', tab)
    }
    setSearchParams(next, { replace: true })
  }

  const content = useMemo(() => {
    if (!projectQuery.data) return null
    const project = projectQuery.data
    const assets = assetsQuery.data ?? []
    const chapters = chaptersQuery.data ?? []
    const outlineAsset = assets.find((asset) => asset.type === 'outline')
    const outlineData = outlineAsset
      ? (parseStructuredContent(outlineAsset.content, 'outline') as OutlineData | null)
      : null
    const plannedChapters = flattenOutlineChapters(outlineData)
    const plannedChapterCount = plannedChapters.length
    const completedChapterCount = chapters.length
    const remainingChapterCount = Math.max(plannedChapterCount - completedChapterCount, 0)

    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* Left: Project details */}
            <Card>
              {isEditing ? (
                <div className="space-y-4">
                  <FormField label="标题">
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="项目标题" />
                  </FormField>
                  <FormField label="状态">
                    <Select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                      <option value="draft">草稿</option>
                      <option value="active">进行中</option>
                      <option value="archived">已归档</option>
                    </Select>
                  </FormField>
                  <FormField label="简介">
                    <Textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={4} placeholder="项目简介" />
                  </FormField>
                  {updateMutation.error && <ErrorState text={getErrorMessage(updateMutation.error)} />}
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={saveEditing} loading={updateMutation.isPending} leftIcon={<Check className="h-3.5 w-3.5" />}>
                      保存
                    </Button>
                    <Button variant="ghost" size="sm" onClick={cancelEditing} leftIcon={<X className="h-3.5 w-3.5" />}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h2 className="text-xl font-light tracking-tight">{project.title}</h2>
                      <Badge variant={getProjectStatusVariant(project.status)} dot>
                        {getProjectStatusLabel(project.status)}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={startEditing} leftIcon={<PencilLine className="h-3.5 w-3.5" />}>
                      编辑
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {project.summary}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      创建于 {formatDate(project.created_at)}
                    </span>
                    <span>更新于 {formatDate(project.updated_at)}</span>
                  </div>

                  {plannedChapterCount > 0 ? (
                    <div className="rounded-xl border border-dashed border-[#D6E4FF] bg-[#F8FBFF] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">写作计划进度</p>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            已完成 {completedChapterCount}/{plannedChapterCount} 章，剩余 {remainingChapterCount} 章待写。
                          </p>
                        </div>
                        <Badge>{Math.round((completedChapterCount / plannedChapterCount) * 100)}%</Badge>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                        <div
                          className="h-full rounded-full bg-[#0F172A] transition-all duration-300"
                          style={{ width: `${Math.min((completedChapterCount / plannedChapterCount) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 space-y-2">
                        {plannedChapters.slice(0, 3).map((chapter) => {
                          const written = chapters.some((item) => item.ordinal === chapter.ordinal)
                          return (
                            <div key={`${chapter.ordinal}-${chapter.title}`} className="flex items-start justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">第 {chapter.ordinal} 章 · {chapter.title || '未命名章节'}</p>
                                {chapter.summary ? <p className="mt-1 text-xs leading-6 text-muted-foreground">{chapter.summary}</p> : null}
                              </div>
                              <Badge variant={written ? 'success' : 'warning'}>{written ? '已写' : '待写'}</Badge>
                            </div>
                          )
                        })}
                        {plannedChapters.length > 3 ? (
                          <p className="text-xs text-muted-foreground">其余 {plannedChapters.length - 3} 章可在大纲与章节页继续推进。</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="border-t border-border pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      删除项目
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Right: Stats cards */}
            <div className="space-y-4">
              {[
                { label: '设定资产', value: assets.length, icon: Boxes, color: 'text-foreground', bg: 'bg-muted' },
                { label: '已写章节', value: completedChapterCount, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: '计划章节', value: plannedChapterCount, icon: FileText, color: 'text-sky-600', bg: 'bg-sky-50' },
                { label: '待写章节', value: remainingChapterCount, icon: ChevronRight, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <Card key={stat.label} padding="md">
                    <div className="flex items-center gap-4">
                      <div className={cn(`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-light tracking-tight text-foreground">{stat.value}</p>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      case 'assets':
        return <AssetsPanel projectId={project.id} />
      case 'chapters':
        return (
          <ChaptersPanel
            projectId={project.id}
            selectedChapterId={selectedChapterId}
            onSelectedChapterChange={setSelectedChapterId}
          />
        )
      case 'memory':
        return (
          <MemoryPanel
            projectId={project.id}
            activeChapterId={selectedChapterId}
            onOpenChapter={openChapterWorkbench}
          />
        )
      case 'prompts':
        return <PromptsPanel projectId={project.id} />
      default:
        return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab, assetsQuery.data, chaptersQuery.data,
    projectQuery.data, isEditing, editTitle, editSummary, editStatus,
    updateMutation.isPending, updateMutation.error, selectedChapterId, showDeleteDialog,
  ])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>项目</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">
              {projectQuery.data?.title ?? '加载中...'}
            </span>
          </div>
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            {projectQuery.data?.title ?? '项目工作台'}
          </h1>
          <p className="text-sm text-muted-foreground">
            统一管理设定资产与章节生成流程
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <Dropdown
            trigger={
              <Button
                variant="secondary"
                size="sm"
                disabled={exportLoading}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                {exportLoading ? '导出中...' : '导出'}
              </Button>
            }
          >
            <DropdownItem
              icon={<FileText className="h-4 w-4" />}
              onClick={() => handleExport('md')}
            >
              Markdown (.md)
            </DropdownItem>
            <DropdownItem
              icon={<FileText className="h-4 w-4" />}
              onClick={() => handleExport('txt')}
            >
              纯文本 (.txt)
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeKey={activeTab} onChange={handleTabChange} />

      {/* Content */}
      <div>
        {projectQuery.isLoading ? <LoadingState text="加载项目中..." /> : null}
        {projectQuery.error ? <ErrorState text={String((projectQuery.error as Error).message)} /> : null}
        {projectQuery.data ? content : null}
      </div>

      {/* Delete dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="删除项目"
        description={`确定要删除项目「${projectQuery.data?.title}」吗？此操作不可撤销，所有相关数据将被永久删除。`}
        size="sm"
      >
        {deleteMutation.error && <ErrorState text={getErrorMessage(deleteMutation.error)} />}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>取消</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
          >
            确认删除
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
