import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpenText, PencilLine } from 'lucide-react'
import { createProject, listProjects, updateProject } from '@/shared/api/projects'
import { queryKeys } from '@/shared/api/queries'
import type { Project, ProjectStatus } from '@/shared/api/types'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState, LoadingState } from '@/shared/ui/feedback'
import { Input, Select, Textarea } from '@/shared/ui/input'
import { SectionTitle } from '@/shared/ui/section-title'
import { getErrorMessage } from '@/shared/lib/error-message'

const projectSchema = z.object({
  title: z.string().trim().min(1, '请填写项目标题'),
  summary: z.string().trim().min(1, '请填写项目简介'),
  status: z.enum(['draft', 'active', 'archived']),
})

type ProjectFormValue = z.infer<typeof projectSchema>

type ProjectEditorMode =
  | { type: 'create' }
  | {
      type: 'edit'
      project: Project
    }

const defaultValues: ProjectFormValue = {
  title: '',
  summary: '',
  status: 'draft',
}

function getStatusLabel(status: ProjectStatus): string {
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

export function ProjectsPanel() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editorMode, setEditorMode] = useState<ProjectEditorMode>({ type: 'create' })
  const [submitError, setSubmitError] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => listProjects({ limit: 50, offset: 0 }),
  })

  const form = useForm<ProjectFormValue>({
    resolver: zodResolver(projectSchema),
    defaultValues,
  })

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      setSubmitError(null)
      form.reset(defaultValues)
      navigate(`/projects/${project.id}`)
    },
    onError: (error) => {
      setSubmitError(getErrorMessage(error))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input: ProjectFormValue }) =>
      updateProject(projectId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      setSubmitError(null)
      setEditorMode({ type: 'create' })
      form.reset(defaultValues)
    },
    onError: (error) => {
      setSubmitError(getErrorMessage(error))
    },
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function onSubmit(value: ProjectFormValue) {
    if (editorMode.type === 'create') {
      createMutation.mutate(value)
      return
    }
    updateMutation.mutate({ projectId: editorMode.project.id, input: value })
  }

  function onEdit(project: Project) {
    setEditorMode({ type: 'edit', project })
    form.reset({
      title: project.title,
      summary: project.summary,
      status: project.status,
    })
  }

  function onCancelEdit() {
    setEditorMode({ type: 'create' })
    setSubmitError(null)
    form.reset(defaultValues)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card tone="blue" className="h-fit">
        <SectionTitle
          title={editorMode.type === 'create' ? '创建项目' : '编辑项目'}
          description="V1 项目仅要求书名、简介与状态。"
        />

        <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-semibold">项目标题</label>
            <Input placeholder="例如：暗潮王城" {...form.register('title')} />
            {form.formState.errors.title ? (
              <p className="mt-1 text-xs font-medium text-red-600">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">项目简介</label>
            <Textarea rows={4} placeholder="一句话简介" {...form.register('summary')} />
            {form.formState.errors.summary ? (
              <p className="mt-1 text-xs font-medium text-red-600">{form.formState.errors.summary.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">状态</label>
            <Select {...form.register('status')}>
              <option value="draft">草稿</option>
              <option value="active">进行中</option>
              <option value="archived">已归档</option>
            </Select>
          </div>

          {submitError ? <ErrorState text={submitError} /> : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={isSubmitting}>
              {editorMode.type === 'create' ? '创建项目' : '保存修改'}
            </Button>
            {editorMode.type === 'edit' ? (
              <Button type="button" variant="secondary" onClick={onCancelEdit}>
                取消编辑
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card tone="default">
        <SectionTitle title="项目列表" description="创建后可进入项目工作台继续设定和章节创作。" />

        {projectsQuery.isLoading ? <LoadingState text="正在加载项目..." /> : null}
        {projectsQuery.error ? <ErrorState text={getErrorMessage(projectsQuery.error)} /> : null}

        {projectsQuery.data && projectsQuery.data.length === 0 ? (
          <p className="rounded-md bg-muted p-4 text-sm text-gray-600">当前没有项目，请先在左侧创建。</p>
        ) : null}

        <div className="space-y-3">
          {projectsQuery.data?.map((project) => (
            <article
              key={project.id}
              className="group rounded-lg bg-muted p-4 transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold tracking-tight">{project.title}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {getStatusLabel(project.status)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" className="h-10 px-3 text-xs" onClick={() => onEdit(project)}>
                    <PencilLine className="mr-1 h-4 w-4" />
                    编辑
                  </Button>
                  <Link to={`/projects/${project.id}`}>
                    <Button className="h-10 px-3 text-xs">
                      <BookOpenText className="mr-1 h-4 w-4" />
                      进入
                    </Button>
                  </Link>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{project.summary}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
