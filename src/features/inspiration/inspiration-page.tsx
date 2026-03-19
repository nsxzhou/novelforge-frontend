import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpenText, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createGuidedProject,
  createProject,
  type GuidedCreateInput,
  type GuidedProjectInput,
} from '@/shared/api/projects'
import type { GuidedProjectCandidate } from '@/shared/api/types'
import { queryKeys } from '@/shared/api/queries'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState } from '@/shared/ui/feedback'
import { FormField, Input, Textarea } from '@/shared/ui/input'
import { StepIndicator } from './step-indicator'
import { StepConditions } from './step-conditions'
import { StepDiscussion } from './step-discussion'
import { StepCandidates } from './step-candidates'
import { StepConfirm } from './step-confirm'

type Mode = 'chooser' | 'guided' | 'manual'
type WizardStep = 'conditions' | 'discussion' | 'candidates' | 'confirm'

const manualSchema = z.object({
  title: z.string().trim().min(1, '请填写项目标题'),
  summary: z.string().trim().min(1, '请填写项目简介'),
})

type ManualFormValue = z.infer<typeof manualSchema>

export function InspirationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<Mode>('chooser')
  const [wizardStep, setWizardStep] = useState<WizardStep>('conditions')
  const [guidedInput, setGuidedInput] = useState<GuidedProjectInput | null>(null)
  const [discussionSummary, setDiscussionSummary] = useState('')
  const [candidates, setCandidates] = useState<GuidedProjectCandidate[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [guidedError, setGuidedError] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)

  const manualForm = useForm<ManualFormValue>({
    resolver: zodResolver(manualSchema),
    defaultValues: { title: '', summary: '' },
  })

  const guidedCreateMutation = useMutation({
    mutationFn: (input: GuidedCreateInput) => createGuidedProject(input),
    onSuccess: async ({ project }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets(project.id, 'all') })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assetsAll(project.id, 'all') })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assetsAll(project.id, 'character') })
      navigate(`/projects/${project.id}?tab=assets`)
    },
    onError: (error) => {
      setGuidedError(String((error as Error).message))
    },
  })

  const manualCreateMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) })
      navigate(`/projects/${project.id}`)
    },
    onError: (error) => {
      setManualError(String((error as Error).message))
    },
  })

  const selectedCandidate = useMemo(
    () => (selectedIndex === null ? null : candidates[selectedIndex] ?? null),
    [candidates, selectedIndex],
  )

  function handleStartBrainstorm(input: GuidedProjectInput) {
    setGuidedInput(input)
    setGuidedError(null)
    setWizardStep('discussion')
  }

  function handleBrainstormComplete(result: { discussion_summary: string; candidates: GuidedProjectCandidate[] }) {
    setDiscussionSummary(result.discussion_summary)
    setCandidates(result.candidates)
    setSelectedIndex(0)
    setWizardStep('candidates')
  }

  function handleBrainstormError(error: string) {
    setGuidedError(error)
    setWizardStep('conditions')
  }

  function handleCreateGuidedProject(seeds: { persist_outline: boolean; persist_worldbuilding: boolean; persist_protagonist: boolean }) {
    if (!selectedCandidate) return
    guidedCreateMutation.mutate({
      candidate: selectedCandidate,
      ...seeds,
    })
  }

  function handleManualCreate(value: ManualFormValue) {
    setManualError(null)
    manualCreateMutation.mutate({
      title: value.title,
      summary: value.summary,
      status: 'draft',
    })
  }

  function handleBackToChooser() {
    setMode('chooser')
    setWizardStep('conditions')
    setGuidedInput(null)
    setCandidates([])
    setSelectedIndex(null)
    setDiscussionSummary('')
    setGuidedError(null)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">New Project</p>
        <h1 className="text-3xl font-light tracking-tight text-foreground">新建项目</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          用组合式条件让 AI 团队展开头脑风暴，或者直接手动创建一个空白项目。
        </p>
      </div>

      {mode === 'chooser' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-[#D6E4FF] bg-[linear-gradient(135deg,#F8FBFF_0%,#EEF4FF_100%)] p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F172A] text-white">
              <Wand2 className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-foreground">AI 组合创建</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              选择题材、世界、主角原型、冲突和风格，4 位 AI Agent 展开头脑风暴，给出 3 个不同方向的候选方案。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">多轮讨论</span>
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">3 个候选</span>
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">可选落库</span>
            </div>
            <div className="mt-8">
              <Button onClick={() => setMode('guided')} rightIcon={<ArrowRight className="h-4 w-4" />}>
                开始组合创建
              </Button>
            </div>
          </Card>

          <Card className="p-8">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <BookOpenText className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-foreground">手动创建</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              直接输入项目标题和简介，先建立一个草稿项目，之后进入工作台再慢慢补世界观、角色和大纲。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-[#E2E8F0] px-3 py-1.5">最简路径</span>
              <span className="rounded-full border border-[#E2E8F0] px-3 py-1.5">立即建项目</span>
            </div>
            <div className="mt-8">
              <Button variant="secondary" onClick={() => setMode('manual')} rightIcon={<ArrowRight className="h-4 w-4" />}>
                改为手动创建
              </Button>
            </div>
          </Card>
        </div>
      )}

      {mode === 'guided' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StepIndicator current={wizardStep} />
            <Button variant="ghost" onClick={handleBackToChooser} leftIcon={<ArrowLeft className="h-4 w-4" />}>
              返回
            </Button>
          </div>

          {guidedError && <ErrorState text={guidedError} />}

          {wizardStep === 'conditions' && (
            <Card className="p-6">
              <StepConditions
                onSubmit={handleStartBrainstorm}
                onManualCreate={() => setMode('manual')}
              />
            </Card>
          )}

          {wizardStep === 'discussion' && guidedInput && (
            <Card className="min-h-[400px] p-6">
              <StepDiscussion
                input={guidedInput}
                onComplete={handleBrainstormComplete}
                onError={handleBrainstormError}
              />
            </Card>
          )}

          {wizardStep === 'candidates' && candidates.length > 0 && (
            <StepCandidates
              discussionSummary={discussionSummary}
              candidates={candidates}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              onNext={() => setWizardStep('confirm')}
            />
          )}

          {wizardStep === 'confirm' && selectedCandidate && (
            <Card className="p-6">
              <StepConfirm
                candidate={selectedCandidate}
                onConfirm={handleCreateGuidedProject}
                isLoading={guidedCreateMutation.isPending}
              />
            </Card>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <div className="mb-5">
              <h2 className="text-xl font-medium tracking-tight text-foreground">手动创建项目</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                先建立一个项目草稿，后续再去工作台补设定、角色和章节内容。
              </p>
            </div>

            <form className="space-y-4" onSubmit={manualForm.handleSubmit(handleManualCreate)}>
              <FormField label="项目标题" error={manualForm.formState.errors.title?.message}>
                <Input placeholder="例如：失忆轨道" {...manualForm.register('title')} />
              </FormField>

              <FormField label="项目简介" error={manualForm.formState.errors.summary?.message}>
                <Textarea rows={5} placeholder="一句话或一小段简介" {...manualForm.register('summary')} />
              </FormField>

              {manualError && <ErrorState text={manualError} />}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={manualCreateMutation.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  创建项目
                </Button>
                <Button type="button" variant="ghost" onClick={handleBackToChooser}>
                  返回模式选择
                </Button>
              </div>
            </form>
          </Card>

          <Card className="border-dashed">
            <div className="max-w-xl space-y-4">
              <h3 className="text-lg font-medium tracking-tight text-foreground">手动路径适合什么情况</h3>
              <p className="text-sm leading-7 text-muted-foreground">
                如果你已经有明确标题和简介，或者只想先占一个坑位，手动创建会比 AI 组合创建更直接。
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <p className="text-sm font-medium text-foreground">更快进入工作台</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">不需要等待候选生成，创建后立刻开始整理设定。</p>
                </div>
                <div className="rounded-xl border border-[#E2E8F0] p-4">
                  <p className="text-sm font-medium text-foreground">更适合已有腹稿</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">你已经知道要写什么，只缺一个正式项目入口。</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
