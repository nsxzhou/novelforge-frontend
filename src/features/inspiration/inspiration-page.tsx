import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, BookOpenText, CheckSquare, Layers3, Sparkles, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  createGuidedProject,
  createProject,
  getGuidedProjectCandidates,
  type GuidedCreateInput,
  type GuidedProjectInput,
} from '@/shared/api/projects'
import type { GuidedProjectCandidate } from '@/shared/api/types'
import { queryKeys } from '@/shared/api/queries'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { ErrorState } from '@/shared/ui/feedback'
import { FormField, Input, Select, Textarea } from '@/shared/ui/input'
import { cn } from '@/shared/lib/cn'

type Mode = 'chooser' | 'guided' | 'manual'

const guidedSchema = z.object({
  genre: z.string().trim().min(1, '请选择题材'),
  setting: z.string().trim().min(1, '请选择时代 / 世界'),
  protagonist_archetype: z.string().trim().min(1, '请选择主角原型'),
  core_conflict: z.string().trim().min(1, '请选择核心冲突'),
  tone: z.string().trim().min(1, '请选择氛围风格'),
  custom_note: z.string().trim().max(240, '补充说明请控制在 240 字以内').optional().or(z.literal('')),
})

const manualSchema = z.object({
  title: z.string().trim().min(1, '请填写项目标题'),
  summary: z.string().trim().min(1, '请填写项目简介'),
})

type GuidedFormValue = z.infer<typeof guidedSchema>
type ManualFormValue = z.infer<typeof manualSchema>

const genreOptions = ['悬疑', '科幻', '奇幻', '古言', '都市', '赛博朋克']
const settingOptions = ['近未来都市', '废弃空间站', '古代王朝', '学院世界', '末日废土', '架空大陆']
const protagonistOptions = ['失忆幸存者', '冷面调查者', '落魄天才', '被迫继承者', '局外观察者', '叛逃者']
const conflictOptions = ['真相追索', '身份反转', '权力争夺', '生存倒计时', '关系背叛', '规则失控']
const toneOptions = ['冷峻悬疑', '压迫惊悚', '浪漫克制', '宏大史诗', '黑色幽默', '明亮热血']

const initialSeeds = {
  persist_outline: true,
  persist_worldbuilding: true,
  persist_protagonist: true,
}

function CandidateSection({
  title,
  content,
}: {
  title: string
  content: string | string[] | undefined
}) {
  if (!content || (Array.isArray(content) && content.length === 0)) return null
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      {Array.isArray(content) ? (
        <p className="text-sm leading-6 text-foreground">{content.join('、')}</p>
      ) : (
        <p className="text-sm leading-6 text-foreground">{content}</p>
      )}
    </div>
  )
}

function GuidedCandidateCard({
  candidate,
  isSelected,
  onSelect,
}: {
  candidate: GuidedProjectCandidate
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border bg-white p-6 text-left transition-all duration-150',
        isSelected ? 'border-[#0F172A] shadow-[0_12px_32px_rgba(15,23,42,0.08)]' : 'border-[#E2E8F0] hover:border-[#94A3B8]',
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">候选方案</p>
          <h3 className="mt-1 text-xl font-medium tracking-tight text-foreground">{candidate.title}</h3>
        </div>
        <div className={cn(
          'flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-xs font-medium',
          isSelected ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'border-[#CBD5E1] text-muted-foreground',
        )}>
          {isSelected ? '已选' : '选择'}
        </div>
      </div>

      <p className="mb-4 text-sm leading-7 text-foreground">{candidate.summary}</p>

      <div className="grid gap-3 md:grid-cols-2">
        <CandidateSection title="故事钩子" content={candidate.hook} />
        <CandidateSection title="核心冲突" content={candidate.core_conflict} />
        <CandidateSection title="氛围风格" content={candidate.tone} />
        <CandidateSection title="主题" content={candidate.outline_seed.themes} />
      </div>

      <div className="mt-4 grid gap-3">
        <CandidateSection title="大纲种子" content={candidate.outline_seed.premise ?? candidate.outline_seed.notes} />
        <CandidateSection title="世界观种子" content={candidate.worldbuilding_seed.history ?? candidate.worldbuilding_seed.notes} />
        <CandidateSection title="主角种子" content={candidate.protagonist_seed.backstory ?? candidate.protagonist_seed.motivation} />
      </div>
    </button>
  )
}

export function InspirationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<Mode>('chooser')
  const [candidates, setCandidates] = useState<GuidedProjectCandidate[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [seedSelection, setSeedSelection] = useState(initialSeeds)
  const [guidedError, setGuidedError] = useState<string | null>(null)
  const [manualError, setManualError] = useState<string | null>(null)

  const guidedForm = useForm<GuidedFormValue>({
    resolver: zodResolver(guidedSchema),
    defaultValues: {
      genre: genreOptions[0],
      setting: settingOptions[0],
      protagonist_archetype: protagonistOptions[0],
      core_conflict: conflictOptions[0],
      tone: toneOptions[0],
      custom_note: '',
    },
  })

  const manualForm = useForm<ManualFormValue>({
    resolver: zodResolver(manualSchema),
    defaultValues: {
      title: '',
      summary: '',
    },
  })

  const guidedCandidatesMutation = useMutation({
    mutationFn: (input: GuidedProjectInput) => getGuidedProjectCandidates(input),
    onSuccess: (result) => {
      setCandidates(result)
      setSelectedIndex(0)
      setSeedSelection(initialSeeds)
      setGuidedError(null)
    },
    onError: (error) => {
      setGuidedError(String((error as Error).message))
    },
  })

  const guidedCreateMutation = useMutation({
    mutationFn: (input: GuidedCreateInput) => createGuidedProject(input),
    onSuccess: async ({ project }) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      await queryClient.invalidateQueries({ queryKey: queryKeys.project(project.id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.assets(project.id, 'all') })
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

  function handleGenerateCandidates(value: GuidedFormValue) {
    setGuidedError(null)
    guidedCandidatesMutation.mutate(value)
  }

  function handleRegenerate() {
    setGuidedError(null)
    guidedCandidatesMutation.mutate(guidedForm.getValues())
  }

  function handleCreateGuidedProject() {
    if (!selectedCandidate) return
    guidedCreateMutation.mutate({
      candidate: selectedCandidate,
      ...seedSelection,
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">New Project</p>
        <h1 className="text-3xl font-light tracking-tight text-foreground">新建项目</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          用组合式条件生成多个项目候选方案，或者直接手动创建一个空白项目。
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
              先选题材、世界、主角原型、冲突和风格，AI 一次给出 3 个不同方向的候选方案，再由你挑选要落库的设定种子。
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">3 个候选</span>
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">可选落库</span>
              <span className="rounded-full border border-[#CBD5E1] px-3 py-1.5">自动跳转设定工坊</span>
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
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="h-fit">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0F172A] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-lg font-medium tracking-tight text-foreground">组合条件</h2>
                <p className="text-xs text-muted-foreground">先定框架，再看候选</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={guidedForm.handleSubmit(handleGenerateCandidates)}>
              <FormField label="题材" error={guidedForm.formState.errors.genre?.message}>
                <Select {...guidedForm.register('genre')}>
                  {genreOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </FormField>

              <FormField label="时代 / 世界" error={guidedForm.formState.errors.setting?.message}>
                <Select {...guidedForm.register('setting')}>
                  {settingOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </FormField>

              <FormField label="主角原型" error={guidedForm.formState.errors.protagonist_archetype?.message}>
                <Select {...guidedForm.register('protagonist_archetype')}>
                  {protagonistOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </FormField>

              <FormField label="核心冲突" error={guidedForm.formState.errors.core_conflict?.message}>
                <Select {...guidedForm.register('core_conflict')}>
                  {conflictOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </FormField>

              <FormField label="氛围风格" error={guidedForm.formState.errors.tone?.message}>
                <Select {...guidedForm.register('tone')}>
                  {toneOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Select>
              </FormField>

              <FormField label="补充说明" description="可选。补充你特别想保留的元素。">
                <Textarea rows={4} showCount maxLength={240} placeholder="例如：希望结尾有强烈身份反转，但情感线要克制。" {...guidedForm.register('custom_note')} />
              </FormField>

              {guidedError && <ErrorState text={guidedError} />}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" loading={guidedCandidatesMutation.isPending} leftIcon={<Layers3 className="h-4 w-4" />}>
                  生成候选
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMode('chooser')}>
                  返回模式选择
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            {candidates.length === 0 ? (
              <Card className="flex min-h-[420px] items-center justify-center border-dashed">
                <div className="max-w-md text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Sparkles className="h-5 w-5 text-foreground" />
                  </div>
                  <h3 className="text-lg font-medium tracking-tight text-foreground">等待生成候选方案</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    提交左侧组合条件后，AI 会一次给出 3 个方向明显不同的项目候选。
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium tracking-tight text-foreground">候选方案</h2>
                    <p className="text-sm text-muted-foreground">选择一个最接近你想法的方向，再决定哪些要素要一起落成初始资产。</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={handleRegenerate} loading={guidedCandidatesMutation.isPending}>
                      换一批
                    </Button>
                    <Button variant="ghost" onClick={() => setCandidates([])}>
                      清空结果
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {candidates.map((candidate, index) => (
                    <GuidedCandidateCard
                      key={`${candidate.title}-${index}`}
                      candidate={candidate}
                      isSelected={selectedIndex === index}
                      onSelect={() => setSelectedIndex(index)}
                    />
                  ))}
                </div>

                {selectedCandidate && (
                  <Card>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium tracking-tight text-foreground">选择落库内容</h3>
                        <p className="text-sm text-muted-foreground">只把你想保留的种子同步创建为初始资产。</p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        { key: 'persist_outline', label: '大纲种子', description: '生成 1 份 outline 资产' },
                        { key: 'persist_worldbuilding', label: '世界观种子', description: '生成 1 份 worldbuilding 资产' },
                        { key: 'persist_protagonist', label: '主角种子', description: '生成 1 份 character 资产' },
                      ].map((item) => (
                        <label key={item.key} className="flex cursor-pointer gap-3 rounded-xl border border-[#E2E8F0] p-4">
                          <input
                            type="checkbox"
                            aria-label={item.label}
                            checked={seedSelection[item.key as keyof typeof seedSelection]}
                            onChange={(e) => {
                              setSeedSelection((prev) => ({ ...prev, [item.key]: e.target.checked }))
                            }}
                            className="mt-1 h-4 w-4 rounded border-border"
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={handleCreateGuidedProject} loading={guidedCreateMutation.isPending} rightIcon={<ArrowRight className="h-4 w-4" />}>
                        创建项目并进入设定工坊
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
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
                <Button type="button" variant="ghost" onClick={() => setMode('chooser')}>
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
